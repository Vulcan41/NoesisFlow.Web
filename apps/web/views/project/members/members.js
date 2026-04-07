import { supabase } from "../../../core/supabase.js";
import { loadView } from "../../../core/router.js";
import { DEFAULT_AVATAR } from "../../../state/userStore.js";
import { showInfo } from "../../../components/info.js";

let currentProject = null;
let currentMembers = [];
let currentUserId = null;
let currentSort = "newest_desc";
let currentSearch = "";
let selectedMemberIds = new Set();
let allMembersSelected = false;
let pendingRequestsExpanded = false;

export async function initMembers(project) {
    if (!project?.id) {
        console.error("No project provided to members view.");
        return;
    }

    currentProject = project;

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
        console.error("Failed to get current user:", userError);
        return;
    }

    currentUserId = user.id;

    await ensureInviteFriendModalComponent();
    setupInviteFriendsButton();

    await refreshMembersView();


}

async function ensureInviteFriendModalComponent() {
    const existingModal = document.getElementById("invite-friend-modal");
    if (existingModal) return;

    const htmlPath = "./components/inviteFriendModal/inviteFriendModal.html";
    const cssPath = "./components/inviteFriendModal/inviteFriendModal.css";

    const res = await fetch(htmlPath);
    const html = await res.text();

    document.body.insertAdjacentHTML("beforeend", html);

    const existingCss = document.getElementById("invite-friend-modal-component-css");
    if (!existingCss) {
        const link = document.createElement("link");
        link.id = "invite-friend-modal-component-css";
        link.rel = "stylesheet";
        link.href = cssPath;
        document.head.appendChild(link);
    }
}

function setupInviteFriendsButton() {
    const btn = document.getElementById("open-invite-friends-btn");
    if (!btn) return;

    btn.onclick = async () => {
        const module = await import("../../../components/inviteFriendModal/inviteFriendModal.js");

        module.initInviteFriendModal({
            projectId: currentProject.id,
            currentMembers,
            currentUserId,
            onInviteSuccess: async (message) => {
                await showInfo({
                    type: "success",
                    message: message || "Invite sent successfully."
                });
                await refreshMembersView();
            },
            onInviteError: async (message) => {
                await showInfo({
                    type: "error",
                    message: message || "Failed to send invite."
                });
            }
        });
    };
}

async function refreshMembersView() {
    await loadMembers(currentProject.id);
}

async function loadMembers(projectId) {
    const list = document.getElementById("members-list");
    if (!list) return;

    list.innerHTML = `<div class="member-empty">Loading members...</div>`;

    const { data, error } = await supabase
        .from("project_members")
        .select(`
            id,
            user_id,
            role,
            membership_status,
            membership_source,
            created_at,
            profiles (
                id,
                username,
                full_name,
                avatar_url
            )
        `)
        .eq("project_id", projectId)
        .in("membership_status", ["active", "pending"])
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error loading project members:", error);
        list.innerHTML = `
            <div class="member-empty">
                Failed to load members: ${escapeHtml(error.message)}
            </div>
        `;
        return;
    }

    currentMembers = data ?? [];

    if (!currentMembers.length) {
        list.innerHTML = `
            <div class="member-empty">
                No members found.
            </div>
        `;
        return;
    }

    const activeMembers = getFilteredActiveMembers();

    const pendingRequestsSection = `
    <div id="pending-requests-section"></div>
`;

    const membersToolbar = `
    <div class="members-toolbar">
        <div class="members-toolbar-left">
            <div class="members-group-title">
    Members (${activeMembers.length})
</div>

<select id="members-sort-select" class="members-sort-select">
    <option value="newest_desc">Newest first</option>
    <option value="newest_asc">Newest last</option>
    <option value="alpha_asc">A → Z</option>
    <option value="alpha_desc">Z → A</option>
</select>

<input
    id="members-search-input"
    class="members-search-input"
    type="text"
    placeholder="Search members..."
    value="${escapeHtml(currentSearch)}"
/>

<button
    id="members-select-all-btn"
    class="members-toolbar-btn members-toolbar-btn-secondary"
    type="button"
>
    Select all
</button>

<button
    id="members-remove-selected-btn"
    class="members-toolbar-btn members-toolbar-btn-danger"
    type="button"
    ${selectedMemberIds.size === 0 ? "disabled" : ""}
>
    Remove
</button>
        </div>
    </div>
`;

    const activeMembersSection = `
    <div class="members-group">
        ${membersToolbar}
        <div id="members-active-list" class="members-group-list"></div>
    </div>
`;

    list.innerHTML = pendingRequestsSection + activeMembersSection;

    renderPendingRequestsSection();
    renderActiveMembersList();

    const hasPending = currentMembers.some(
        m => m.membership_status === "pending" && m.membership_source === "request"
    );

    const section = document.querySelector(".members-section");

    if (section) {
        section.classList.toggle("no-pending", !hasPending);
    }

    setupSort();
    setupSearch();
    setupBulkActions();
    bindMemberAvatarFallbacks();
    bindMemberProfileLinks();
    updateToolbarSelectionState();

}

function renderMemberRow(member, sectionType) {
    const username = member.profiles?.username ?? "user";
    const fullName = member.profiles?.full_name || username || "Unknown user";
    const avatarUrl = member.profiles?.avatar_url?.trim() || DEFAULT_AVATAR;

    if (sectionType === "request") {
        return `
            <div class="member-row" data-user-id="${member.user_id}">
                <div
                    class="member-row-left member-profile-link"
                    data-user-id="${member.user_id}"
                >
                    <div class="member-avatar">
                        <img
                            src="${escapeHtml(avatarUrl)}"
                            alt="${escapeHtml(username)} avatar"
                            class="member-avatar-image"
                        />
                    </div>

                    <div class="member-info">
                        <div class="member-name">${escapeHtml(fullName)}</div>
                        <div class="member-username">@${escapeHtml(username)}</div>
                    </div>

                    <div class="member-tooltip">Προβολή προφίλ</div>
                </div>

                <div class="member-row-right">
                    <button
                        class="member-action-btn member-approve-btn"
                        type="button"
                        data-user-id="${member.user_id}"
                    >
                        Approve
                    </button>

                    <button
                        class="member-action-btn member-reject-btn"
                        type="button"
                        data-user-id="${member.user_id}"
                    >
                        Reject
                    </button>
                </div>
            </div>
        `;
    }

    return "";
}

function renderActiveMemberInsideBox(member) {
    const username = member.profiles?.username ?? "user";
    const fullName = member.profiles?.full_name || username || "Unknown user";
    const avatarUrl = member.profiles?.avatar_url?.trim() || DEFAULT_AVATAR;

    return `
        <div class="member-row member-row-inside-box" data-user-id="${member.user_id}">
            <div
                class="member-row-left member-profile-link"
                data-user-id="${member.user_id}"
            >
                <div class="member-avatar">
                    <img
                        src="${escapeHtml(avatarUrl)}"
                        alt="${escapeHtml(username)} avatar"
                        class="member-avatar-image"
                    />
                </div>

                <div class="member-info">
                    <div class="member-name">${escapeHtml(fullName)}</div>
                    <div class="member-username">@${escapeHtml(username)}</div>
                </div>

                <div class="member-tooltip">Προβολή προφίλ</div>
            </div>

            <div class="member-row-right">
                <span class="member-pill ${
                    member.role === "owner"
                        ? "member-pill-role-owner"
                        : "member-pill-role-member"
                }">
                    ${escapeHtml(member.role)}
                </span>
            </div>
        </div>
    `;
}

function renderPendingRequestsSection() {
    const container = document.getElementById("pending-requests-section");
    if (!container) return;

    const pendingRequests = sortMembers(
        currentMembers.filter(
            (member) =>
            member.membership_status === "pending" &&
            member.membership_source === "request"
        )
    );

    if (!pendingRequests.length) {
        container.innerHTML = "";
        return;
    }

    const visiblePendingRequests =
    pendingRequestsExpanded || pendingRequests.length <= 3
    ? pendingRequests
    : pendingRequests.slice(0, 2);

    const toggleButton =
    pendingRequests.length > 3
    ? `
                <button
                    id="pending-requests-toggle-btn"
                    class="members-group-toggle-btn"
                    type="button"
                >
                    ${pendingRequestsExpanded ? "Collapse" : "Show all"}
                </button>
            `
    : "";

    container.innerHTML = `
    <div class="members-group">
        <div class="members-group-header members-group-header-inline">
            <div class="members-group-title">
                Pending requests (${pendingRequests.length})
            </div>
            ${toggleButton}
        </div>

        <div class="members-group-list">
            ${visiblePendingRequests.map((member) => renderMemberRow(member, "request")).join("")}
        </div>
    </div>
`;

    bindMemberActions(currentProject.id);
    bindMemberAvatarFallbacks();
    bindMemberProfileLinks();
    setupPendingRequestsToggle();
}

function bindMemberActions(projectId) {
    const approveButtons = document.querySelectorAll(".member-approve-btn");
    const rejectButtons = document.querySelectorAll(".member-reject-btn");

    approveButtons.forEach((button) => {
        button.onclick = async () => {
            const userId = button.dataset.userId;
            if (!userId) return;

            const { data, error } = await supabase.rpc("accept_project_request", {
                p_project_id: projectId,
                p_user_id: userId
            });

            if (error) {
                console.error("Accept request failed:", error);
                await showInfo({
                    type: "error",
                    message: error.message || "Failed to approve request."
                });
                return;
            }

            if (data === "accepted") {
                await showInfo({
                    type: "success",
                    message: "Request approved successfully."
                });
            }

            await refreshMembersView();
        };
    });

    rejectButtons.forEach((button) => {
        button.onclick = async () => {
            const userId = button.dataset.userId;
            if (!userId) return;

            const { data, error } = await supabase.rpc("reject_project_request", {
                p_project_id: projectId,
                p_user_id: userId
            });

            if (error) {
                console.error("Reject request failed:", error);
                await showInfo({
                    type: "error",
                    message: error.message || "Failed to reject request."
                });
                return;
            }

            if (data === "rejected") {
                await showInfo({
                    type: "success",
                    message: "Request rejected."
                });
            }

            await refreshMembersView();
        };
    });
}

function bindMemberAvatarFallbacks() {
    const images = document.querySelectorAll(".member-avatar-image");

    images.forEach((img) => {
        img.onerror = () => {
            img.src = DEFAULT_AVATAR;
        };
    });
}

function bindMemberProfileLinks() {
    const profileLinks = document.querySelectorAll(".member-profile-link");

    profileLinks.forEach((el) => {
        el.addEventListener("click", async () => {
            const userId = el.dataset.userId;
            if (!userId) return;

            const {
                data: { user }
            } = await supabase.auth.getUser();

            if (user && user.id === userId) {
                loadView("profile");
            } else {
                loadView("profileOther", userId);
            }
        });

        el.addEventListener("mouseenter", () => {
            const tooltip = el.querySelector(".member-tooltip");
            tooltip?.classList.add("tooltip-visible");
        });

        el.addEventListener("mouseleave", () => {
            const tooltip = el.querySelector(".member-tooltip");
            tooltip?.classList.remove("tooltip-visible");
        });
    });
}

function setupPendingRequestsToggle() {
    const button = document.getElementById("pending-requests-toggle-btn");
    if (!button) return;

    button.onclick = () => {
        pendingRequestsExpanded = !pendingRequestsExpanded;
        renderPendingRequestsSection();
    };
}

function sortMembers(list) {
    const sorted = [...list];

    switch (currentSort) {
        case "newest_desc":
            return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        case "newest_asc":
            return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        case "alpha_asc":
            return sorted.sort((a, b) => {
                const aName = (a.profiles?.full_name || a.profiles?.username || "").toLowerCase();
                const bName = (b.profiles?.full_name || b.profiles?.username || "").toLowerCase();
                return aName.localeCompare(bName);
            });

        case "alpha_desc":
            return sorted.sort((a, b) => {
                const aName = (a.profiles?.full_name || a.profiles?.username || "").toLowerCase();
                const bName = (b.profiles?.full_name || b.profiles?.username || "").toLowerCase();
                return bName.localeCompare(aName);
            });

        default:
            return sorted;
    }
}

function getFilteredActiveMembers() {
    return sortMembers(
        currentMembers.filter((member) => {
            if (member.membership_status !== "active") return false;

            const search = currentSearch.trim().toLowerCase();
            if (!search) return true;

            const fullName = (member.profiles?.full_name || "").toLowerCase();
            const username = (member.profiles?.username || "").toLowerCase();

            return fullName.includes(search) || username.includes(search);
        })
    );
}

function renderActiveMembersList() {
    const container = document.getElementById("members-active-list");
    if (!container) return;

    const activeMembers = getFilteredActiveMembers();

    if (!activeMembers.length) {
        container.innerHTML = `
            <div class="member-empty">
                No matching members found.
            </div>
        `;
        updateToolbarSelectionState();
        return;
    }

    container.innerHTML = `
        <div class="members-active-layout">
            <div class="members-active-checkboxes">
                ${activeMembers.map((member) => `
                    <div class="member-row-checkbox">
                        ${
                            member.role !== "owner"
                                ? `
                                    <input
                                        type="checkbox"
                                        class="member-select-checkbox"
                                        data-user-id="${member.user_id}"
                                        ${selectedMemberIds.has(member.user_id) ? "checked" : ""}
                                    />
                                `
                                : ""
                        }
                    </div>
                `).join("")}
            </div>

            <div class="members-active-box">
                ${activeMembers.map((member) => renderActiveMemberInsideBox(member)).join("")}
            </div>
        </div>
    `;

    bindMemberSelection();
    bindMemberAvatarFallbacks();
    bindMemberProfileLinks();
    updateToolbarSelectionState();
}

function getSelectableActiveMembers() {
    return currentMembers.filter(
        (member) =>
        member.membership_status === "active" &&
        member.role !== "owner"
    );
}

function bindMemberSelection() {
    const checkboxes = document.querySelectorAll(".member-select-checkbox");

    checkboxes.forEach((checkbox) => {
        checkbox.onchange = () => {
            const userId = checkbox.dataset.userId;
            if (!userId) return;

            if (checkbox.checked) {
                selectedMemberIds.add(userId);
            } else {
                selectedMemberIds.delete(userId);
            }

            updateToolbarSelectionState();
        };
    });
}

function updateToolbarSelectionState() {
    const removeBtn = document.getElementById("members-remove-selected-btn");
    const selectAllBtn = document.getElementById("members-select-all-btn");

    if (removeBtn) {
        removeBtn.disabled = selectedMemberIds.size === 0;
    }

    if (selectAllBtn) {
        const selectableIds = getFilteredActiveMembers()
            .filter((member) => member.role !== "owner")
            .map((member) => member.user_id);

        const allVisibleSelected =
        selectableIds.length > 0 &&
        selectableIds.every((id) => selectedMemberIds.has(id));

        selectAllBtn.textContent = allVisibleSelected ? "Deselect all" : "Select all";
    }
}

function setupBulkActions() {
    const selectAllBtn = document.getElementById("members-select-all-btn");
    const removeBtn = document.getElementById("members-remove-selected-btn");

    if (selectAllBtn) {
        selectAllBtn.onclick = () => {
            const visibleSelectableMembers = getFilteredActiveMembers().filter(
                (member) => member.role !== "owner"
            );

            const visibleIds = visibleSelectableMembers.map((member) => member.user_id);

            const allVisibleSelected =
            visibleIds.length > 0 &&
            visibleIds.every((id) => selectedMemberIds.has(id));

            if (allVisibleSelected) {
                visibleIds.forEach((id) => selectedMemberIds.delete(id));
            } else {
                visibleIds.forEach((id) => selectedMemberIds.add(id));
            }

            updateToolbarSelectionState();
            renderActiveMembersList();
        };
    }

    if (removeBtn) {
        removeBtn.onclick = async () => {
            if (selectedMemberIds.size === 0) return;

            const confirmed = window.confirm(
                `Remove ${selectedMemberIds.size} selected member${selectedMemberIds.size === 1 ? "" : "s"} from the project?`
            );

            if (!confirmed) return;

            const selectedIds = [...selectedMemberIds];

            const membershipsToRemove = currentMembers.filter(
                (member) =>
                member.membership_status === "active" &&
                member.role !== "owner" &&
                selectedIds.includes(member.user_id)
            );

            if (!membershipsToRemove.length) return;

            const membershipRowIds = membershipsToRemove.map((member) => member.id);

            const { error } = await supabase
                .from("project_members")
                .update({ membership_status: "removed" })
                .in("id", membershipRowIds);

            if (error) {
                console.error("Bulk remove failed:", error);
                await showInfo({
                    type: "error",
                    message: error.message || "Failed to remove selected members."
                });
                return;
            }

            selectedMemberIds.clear();

            await showInfo({
                type: "success",
                message: membershipsToRemove.length === 1
                ? "Member removed successfully."
                : "Selected members removed successfully."
            });

            await refreshMembersView();
        };
    }

    updateToolbarSelectionState();
}

function setupSort() {
    const select = document.getElementById("members-sort-select");
    if (!select) return;

    select.value = currentSort;

    select.onchange = () => {
        currentSort = select.value;
        renderActiveMembersList();
    };
}

function setupSearch() {
    const input = document.getElementById("members-search-input");
    if (!input) return;

    input.value = currentSearch;

    input.oninput = () => {
        currentSearch = input.value;
        renderActiveMembersList();
    };
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}