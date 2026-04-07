import { supabase } from "../../core/supabase.js";
import { DEFAULT_AVATAR } from "../../state/userStore.js";
import { showInfo } from "../../components/info.js";

let currentConfig = null;
let inviteSearch = "";
let inviteSort = "alpha_asc";
let selectedInviteIds = new Set();
let pendingInvitesExpanded = false;

export async function initInviteFriendModal(config) {
    currentConfig = {
        ...config,
        currentMembers: [...(config.currentMembers ?? [])]
    };

    const modal = document.getElementById("invite-friend-modal");
    const closeBtn = document.getElementById("invite-friend-close-btn");
    const cancelBtn = document.getElementById("invite-friend-cancel-btn");
    const backdrop = modal?.querySelector(".invite-friend-backdrop");

    if (!modal) return;

    inviteSearch = "";
    inviteSort = "alpha_asc";
    selectedInviteIds = new Set();
    pendingInvitesExpanded = false;

    modal.classList.remove("hidden");

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    backdrop.onclick = closeModal;

    document.onkeydown = (event) => {
        if (event.key === "Escape" && !modal.classList.contains("hidden")) {
            closeModal();
        }
    };

    await loadInviteModalContent();
}

function closeModal() {
    const modal = document.getElementById("invite-friend-modal");
    if (!modal) return;

    modal.classList.add("hidden");
}

async function loadInviteModalContent() {
    if (!currentConfig) return;

    const pendingSection = document.getElementById("invite-friend-pending-section");
    const inviteSection = document.getElementById("invite-friend-invite-section");

    if (!pendingSection || !inviteSection) return;

    renderPendingInvitesSection();

    const { data: friendships, error: friendshipsError } = await supabase
        .from("friendships")
        .select("requester_id, receiver_id, status")
        .eq("status", "accepted")
        .or(`requester_id.eq.${currentConfig.currentUserId},receiver_id.eq.${currentConfig.currentUserId}`);

    if (friendshipsError) {
        console.error("Failed to load friendships:", friendshipsError);
        inviteSection.innerHTML = `
            <div class="invite-friend-section">
                <div class="invite-friend-section-title">Invite friends</div>
                <div class="invite-friend-empty">
                    Failed to load friends.
                </div>
            </div>
        `;
        return;
    }

    const friendIds = (friendships ?? [])
        .map((row) =>
    row.requester_id === currentConfig.currentUserId
    ? row.receiver_id
    : row.requester_id
    )
        .filter(Boolean);

    if (!friendIds.length) {
        inviteSection.innerHTML = `
            <div class="invite-friend-section">
                <div class="invite-friend-section-title">Invite friends</div>
                <div class="invite-friend-empty">
                    You have no accepted friends to invite yet.
                </div>
            </div>
        `;
        return;
    }

    const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", friendIds);

    if (profilesError) {
        console.error("Failed to load friend profiles:", profilesError);
        inviteSection.innerHTML = `
            <div class="invite-friend-section">
                <div class="invite-friend-section-title">Invite friends</div>
                <div class="invite-friend-empty">
                    Failed to load friend profiles.
                </div>
            </div>
        `;
        return;
    }

    const membershipByUserId = new Map(
        (currentConfig.currentMembers ?? []).map((member) => [member.user_id, member])
    );

    const inviteableProfiles = (profiles ?? []).filter((profile) => {
        return !membershipByUserId.has(profile.id);
    });

    currentConfig.inviteableProfiles = [...inviteableProfiles];

    renderInviteableFriendsSection();
}

function renderPendingInvitesSection() {
    const container = document.getElementById("invite-friend-pending-section");
    if (!container || !currentConfig) return;

    const pendingInvites = sortInviteItems(
        (currentConfig.currentMembers ?? []).filter(
            (member) =>
            member.membership_status === "pending" &&
            member.membership_source === "invite"
        )
    );

    if (!pendingInvites.length) {
        container.innerHTML = "";
        return;
    }

    const visiblePendingInvites =
    pendingInvitesExpanded || pendingInvites.length <= 3
    ? pendingInvites
    : pendingInvites.slice(0, 2);

    const toggleButton =
    pendingInvites.length > 3
    ? `
                <button
                    id="invite-friend-pending-toggle-btn"
                    class="invite-friend-group-toggle-btn"
                    type="button"
                >
                    ${pendingInvitesExpanded ? "Collapse" : "Show all"}
                </button>
            `
    : "";

    container.innerHTML = `
        <div class="invite-friend-section">
            <div class="invite-friend-section-header">
                <div class="invite-friend-section-title">
                    Pending invites (${pendingInvites.length})
                </div>
                ${toggleButton}
            </div>

            <div class="invite-friend-group-list">
                ${visiblePendingInvites.map(renderPendingInviteRow).join("")}
            </div>
        </div>
    `;

    bindInviteAvatarFallbacks();
    setupPendingInvitesToggle();
}

function renderInviteableFriendsSection() {
    const container = document.getElementById("invite-friend-invite-section");
    if (!container || !currentConfig) return;

    const inviteableProfiles = getFilteredInviteableProfiles();

    const toolbar = `
        <div class="invite-friend-toolbar">
            <div class="invite-friend-toolbar-left">
                <div id="invite-friend-section-title" class="invite-friend-section-title">
                    Invite friends (${inviteableProfiles.length})
                </div>

                <select id="invite-friend-sort-select" class="invite-friend-sort-select">
                    <option value="alpha_asc">A → Z</option>
                    <option value="alpha_desc">Z → A</option>
                    <option value="newest_desc">Newest first</option>
                    <option value="newest_asc">Newest last</option>
                </select>

                <input
                    id="invite-friend-search-input"
                    class="invite-friend-search-input"
                    type="text"
                    placeholder="Search friends..."
                    value="${escapeHtml(inviteSearch)}"
                />

                <button
                    id="invite-friend-select-all-btn"
                    class="invite-friend-toolbar-btn invite-friend-toolbar-btn-secondary"
                    type="button"
                >
                    Select all
                </button>

            </div>
        </div>

        <div id="invite-friend-active-list"></div>
    `;

    container.innerHTML = `
        <div class="invite-friend-section">
            ${toolbar}
        </div>
    `;

    setupInviteSort();
    setupInviteSearch();
    setupInviteBulkActions();
    renderInviteableFriendsList();
}

function renderPendingInviteRow(member) {
    const username = member.profiles?.username ?? "user";
    const fullName = member.profiles?.full_name || username || "Unknown user";
    const avatarUrl = member.profiles?.avatar_url?.trim() || DEFAULT_AVATAR;

    return `
        <div class="invite-friend-row">
            <div class="invite-friend-row-left">
                <div class="invite-friend-avatar">
                    <img
                        src="${escapeHtml(avatarUrl)}"
                        alt="${escapeHtml(username)} avatar"
                        class="invite-friend-avatar-image"
                    />
                </div>

                <div class="invite-friend-info">
                    <div class="invite-friend-name">${escapeHtml(fullName)}</div>
                    <div class="invite-friend-username">@${escapeHtml(username)}</div>
                </div>
            </div>

            <div class="invite-friend-row-right">
                <span class="invite-friend-pill">invite sent</span>
            </div>
        </div>
    `;
}

function renderInviteFriendInsideBox(profile) {
    const username = profile.username ?? "user";
    const fullName = profile.full_name || username || "Unknown user";
    const avatarUrl = profile.avatar_url?.trim() || DEFAULT_AVATAR;

    return `
        <div class="invite-friend-row invite-friend-row-inside-box">
            <div class="invite-friend-row-left">
                <div class="invite-friend-avatar">
                    <img
                        src="${escapeHtml(avatarUrl)}"
                        alt="${escapeHtml(username)} avatar"
                        class="invite-friend-avatar-image"
                    />
                </div>

                <div class="invite-friend-info">
                    <div class="invite-friend-name">${escapeHtml(fullName)}</div>
                    <div class="invite-friend-username">@${escapeHtml(username)}</div>
                </div>
            </div>
        </div>
    `;
}

function setupPendingInvitesToggle() {
    const button = document.getElementById("invite-friend-pending-toggle-btn");
    if (!button) return;

    button.onclick = () => {
        pendingInvitesExpanded = !pendingInvitesExpanded;
        renderPendingInvitesSection();
    };
}

function sortInviteItems(list) {
    const sorted = [...list];

    switch (inviteSort) {
        case "newest_desc":
            return sorted.sort((a, b) => {
                const aDate = new Date(a.created_at || 0);
                const bDate = new Date(b.created_at || 0);
                return bDate - aDate;
            });

        case "newest_asc":
            return sorted.sort((a, b) => {
                const aDate = new Date(a.created_at || 0);
                const bDate = new Date(b.created_at || 0);
                return aDate - bDate;
            });

        case "alpha_desc":
            return sorted.sort((a, b) => {
                const aName = (a.full_name || a.profiles?.full_name || a.username || a.profiles?.username || "").toLowerCase();
                const bName = (b.full_name || b.profiles?.full_name || b.username || b.profiles?.username || "").toLowerCase();
                return bName.localeCompare(aName);
            });

        case "alpha_asc":
        default:
            return sorted.sort((a, b) => {
                const aName = (a.full_name || a.profiles?.full_name || a.username || a.profiles?.username || "").toLowerCase();
                const bName = (b.full_name || b.profiles?.full_name || b.username || b.profiles?.username || "").toLowerCase();
                return aName.localeCompare(bName);
            });
    }
}

function getFilteredInviteableProfiles() {
    return sortInviteItems(
        (currentConfig?.inviteableProfiles ?? []).filter((profile) => {
            const search = inviteSearch.trim().toLowerCase();
            if (!search) return true;

            const fullName = (profile.full_name || "").toLowerCase();
            const username = (profile.username || "").toLowerCase();

            return fullName.includes(search) || username.includes(search);
        })
    );
}

function renderInviteableFriendsList() {
    const container = document.getElementById("invite-friend-active-list");
    if (!container) return;

    const inviteableProfiles = getFilteredInviteableProfiles();

    if (!inviteableProfiles.length) {
        container.innerHTML = `
            <div class="invite-friend-empty">
                No inviteable friends available.
            </div>
        `;
        updateInviteToolbarState();
        return;
    }

    container.innerHTML = `
        <div class="invite-friend-active-layout">
            <div class="invite-friend-checkboxes">
                ${inviteableProfiles.map((profile) => `
                    <div class="invite-friend-row-checkbox">
                        <input
                            type="checkbox"
                            class="invite-friend-select-checkbox"
                            data-user-id="${profile.id}"
                            ${selectedInviteIds.has(profile.id) ? "checked" : ""}
                        />
                    </div>
                `).join("")}
            </div>

            <div class="invite-friend-box">
                ${inviteableProfiles.map(renderInviteFriendInsideBox).join("")}
            </div>
        </div>
    `;

    bindInviteSelection();
    bindInviteAvatarFallbacks();
    updateInviteToolbarState();
}

function updateInviteSectionCount() {
    const title = document.getElementById("invite-friend-section-title");
    if (!title) return;

    title.textContent = `Invite friends (${getFilteredInviteableProfiles().length})`;
}

function bindInviteSelection() {
    const checkboxes = document.querySelectorAll(".invite-friend-select-checkbox");

    checkboxes.forEach((checkbox) => {
        checkbox.onchange = () => {
            const userId = checkbox.dataset.userId;
            if (!userId) return;

            if (checkbox.checked) {
                selectedInviteIds.add(userId);
            } else {
                selectedInviteIds.delete(userId);
            }

            updateInviteToolbarState();
        };
    });
}

function updateInviteToolbarState() {
    const inviteSelectedBtn = document.getElementById("invite-friend-invite-selected-btn");
    const selectAllBtn = document.getElementById("invite-friend-select-all-btn");

    if (inviteSelectedBtn) {
        inviteSelectedBtn.disabled = selectedInviteIds.size === 0;
    }

    if (selectAllBtn) {
        const visibleIds = getFilteredInviteableProfiles().map((profile) => profile.id);

        const allVisibleSelected =
        visibleIds.length > 0 &&
        visibleIds.every((id) => selectedInviteIds.has(id));

        selectAllBtn.textContent = allVisibleSelected ? "Deselect all" : "Select all";
    }
}

function setupInviteBulkActions() {
    const selectAllBtn = document.getElementById("invite-friend-select-all-btn");
    const inviteSelectedBtn = document.getElementById("invite-friend-invite-selected-btn");

    if (selectAllBtn) {
        selectAllBtn.onclick = () => {
            const visibleProfiles = getFilteredInviteableProfiles();
            const visibleIds = visibleProfiles.map((profile) => profile.id);

            const allVisibleSelected =
            visibleIds.length > 0 &&
            visibleIds.every((id) => selectedInviteIds.has(id));

            if (allVisibleSelected) {
                visibleIds.forEach((id) => selectedInviteIds.delete(id));
            } else {
                visibleIds.forEach((id) => selectedInviteIds.add(id));
            }

            updateInviteToolbarState();
            renderInviteableFriendsSection();
        };
    }

    if (inviteSelectedBtn) {
        inviteSelectedBtn.onclick = async () => {
            const selectedIds = [...selectedInviteIds];
            if (!selectedIds.length) return;

            let successCount = 0;

            for (const userId of selectedIds) {
                const { data, error } = await supabase.rpc("invite_user_to_project", {
                    p_project_id: currentConfig.projectId,
                    p_user_id: userId
                });

                if (error) {
                    console.error("Bulk invite failed:", error);
                    continue;
                }

                if (data === "invited" || data === "already_invited") {
                    successCount += 1;
                }

                if (data === "request_accepted_by_invite") {
                    successCount += 1;
                }

                currentConfig.currentMembers = [
                    ...(currentConfig.currentMembers ?? []).filter(
                        (member) => member.user_id !== userId
                    ),
                    {
                        user_id: userId,
                        membership_status: data === "request_accepted_by_invite" ? "active" : "pending",
                        membership_source: "invite"
                    }
                ];
            }

            currentConfig.inviteableProfiles = (currentConfig.inviteableProfiles ?? []).filter(
                (profile) => !selectedIds.includes(profile.id)
            );

            selectedInviteIds.clear();

            if (successCount > 0) {
                await showInfo({
                    type: "success",
                    message: successCount === 1
                    ? "Invite sent successfully."
                    : `${successCount} invites processed successfully.`
                });

                currentConfig.onInviteSuccess?.(
                successCount === 1
                ? "Invite sent successfully."
                : `${successCount} invites processed successfully.`
                );
            }

            renderPendingInvitesSection();
            updateInviteSectionCount();
            renderInviteableFriendsList();
        };
    }

    updateInviteToolbarState();
}

function setupInviteSort() {
    const select = document.getElementById("invite-friend-sort-select");
    if (!select) return;

    select.value = inviteSort;

    select.onchange = () => {
        inviteSort = select.value;
        renderPendingInvitesSection();
        updateInviteSectionCount();
        renderInviteableFriendsList();
    };
}

function setupInviteSearch() {
    const input = document.getElementById("invite-friend-search-input");
    if (!input) return;

    input.value = inviteSearch;

    input.oninput = () => {
        inviteSearch = input.value;
        updateInviteSectionCount();
        renderInviteableFriendsList();
    };
}

function bindInviteButtons() {
    const buttons = document.querySelectorAll(".invite-friend-btn");

    buttons.forEach((button) => {
        button.onclick = async () => {
            const userId = button.dataset.userId;
            if (!userId || !currentConfig) return;

            button.disabled = true;
            button.textContent = "Inviting...";

            const { data, error } = await supabase.rpc("invite_user_to_project", {
                p_project_id: currentConfig.projectId,
                p_user_id: userId
            });

            if (error) {
                console.error("Invite failed:", error);
                await showInfo({
                    type: "error",
                    message: error.message || "Failed to send invite."
                });
                button.disabled = false;
                button.textContent = "Invite";
                currentConfig.onInviteError?.(error.message || "Failed to send invite.");
                return;
            }

            let successMessage = "Invite sent successfully.";

            if (data === "already_member") {
                successMessage = "This friend is already a member.";
            } else if (data === "already_invited") {
                successMessage = "This friend has already been invited.";
            } else if (data === "request_accepted_by_invite") {
                successMessage = "Friend had a pending request and is now an active member.";
            } else if (data === "not_friends") {
                await showInfo({
                    type: "error",
                    message: "You can only invite accepted friends."
                });
                button.disabled = false;
                button.textContent = "Invite";
                currentConfig.onInviteError?.("You can only invite accepted friends.");
                return;
            } else if (data === "cannot_invite_self") {
                await showInfo({
                    type: "error",
                    message: "You cannot invite yourself."
                });
                button.disabled = false;
                button.textContent = "Invite";
                currentConfig.onInviteError?.("You cannot invite yourself.");
                return;
            }

            currentConfig.currentMembers = [
                ...(currentConfig.currentMembers ?? []).filter(
                    (member) => member.user_id !== userId
                ),
                {
                    user_id: userId,
                    membership_status: data === "request_accepted_by_invite" ? "active" : "pending",
                    membership_source: "invite"
                }
            ];

            currentConfig.inviteableProfiles = (currentConfig.inviteableProfiles ?? []).filter(
                (profile) => profile.id !== userId
            );

            selectedInviteIds.delete(userId);

            await showInfo({
                type: "success",
                message: successMessage
            });

            currentConfig.onInviteSuccess?.(successMessage);

            renderPendingInvitesSection();
            renderInviteableFriendsSection();
        };
    });
}

function bindInviteAvatarFallbacks() {
    const images = document.querySelectorAll(".invite-friend-avatar-image");

    images.forEach((img) => {
        img.onerror = () => {
            img.src = DEFAULT_AVATAR;
        };
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
