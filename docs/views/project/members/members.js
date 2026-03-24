import { supabase } from "../../../core/supabase.js";
import { loadView } from "../../../core/router.js";
import { DEFAULT_AVATAR } from "../../../state/userStore.js";

let currentProject = null;
let currentMembers = [];
let currentUserId = null;

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
                showSuccess(message || "Invite sent successfully.");
                await refreshMembersView();
            },
            onInviteError: (message) => {
                showError(message || "Failed to send invite.");
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

    const pendingRequests = currentMembers.filter(
        (member) =>
        member.membership_status === "pending" &&
        member.membership_source === "request"
    );

    const activeMembers = currentMembers.filter(
        (member) => member.membership_status === "active"
    );

    const pendingRequestsSection = pendingRequests.length
    ? `
            <div class="members-group">
                <div class="members-group-title">Pending requests</div>
                <div class="members-group-list">
                    ${pendingRequests.map((member) => renderMemberRow(member, "request")).join("")}
                </div>
            </div>
        `
    : "";

    const activeMembersSection = `
        <div class="members-group">
            <div class="members-group-title">Members</div>
            <div class="members-group-list">
                ${activeMembers.map((member) => renderMemberRow(member, "active")).join("")}
            </div>
        </div>
    `;

    list.innerHTML = pendingRequestsSection + activeMembersSection;

    bindMemberActions(projectId);
    bindMemberAvatarFallbacks();
    bindMemberProfileLinks();
}

function renderMemberRow(member, sectionType) {
    const username = member.profiles?.username ?? "user";
    const fullName = member.profiles?.full_name || username || "Unknown user";
    const avatarUrl = member.profiles?.avatar_url?.trim() || DEFAULT_AVATAR;

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
                ${
                    sectionType === "active"
                        ? `
                            <span class="member-pill member-pill-role">
                                ${escapeHtml(member.role)}
                            </span>
                            <span class="member-pill member-pill-status">
                                active
                            </span>
                        `
                        : ""
                }

                ${
                    sectionType === "request"
                        ? `
                            <span class="member-pill member-pill-neutral">
                                request
                            </span>

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
                        `
                        : ""
                }
            </div>
        </div>
    `;
}

function bindMemberActions(projectId) {
    const approveButtons = document.querySelectorAll(".member-approve-btn");
    const rejectButtons = document.querySelectorAll(".member-reject-btn");

    approveButtons.forEach((button) => {
        button.onclick = async () => {
            const userId = button.dataset.userId;
            if (!userId) return;

            clearFeedback();

            const { data, error } = await supabase.rpc("accept_project_request", {
                p_project_id: projectId,
                p_user_id: userId
            });

            if (error) {
                console.error("Accept request failed:", error);
                showError(error.message || "Failed to approve request.");
                return;
            }

            if (data === "accepted") {
                showSuccess("Request approved successfully.");
            }

            await refreshMembersView();
        };
    });

    rejectButtons.forEach((button) => {
        button.onclick = async () => {
            const userId = button.dataset.userId;
            if (!userId) return;

            clearFeedback();

            const { data, error } = await supabase.rpc("reject_project_request", {
                p_project_id: projectId,
                p_user_id: userId
            });

            if (error) {
                console.error("Reject request failed:", error);
                showError(error.message || "Failed to reject request.");
                return;
            }

            if (data === "rejected") {
                showSuccess("Request rejected.");
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

function showError(message) {
    const errorBox = document.getElementById("members-feedback-error");
    const successBox = document.getElementById("members-feedback-success");

    if (successBox) {
        successBox.textContent = "";
        successBox.classList.add("hidden");
    }

    if (!errorBox) return;

    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function showSuccess(message) {
    const errorBox = document.getElementById("members-feedback-error");
    const successBox = document.getElementById("members-feedback-success");

    if (errorBox) {
        errorBox.textContent = "";
        errorBox.classList.add("hidden");
    }

    if (!successBox) return;

    successBox.textContent = message;
    successBox.classList.remove("hidden");
}

function clearFeedback() {
    const errorBox = document.getElementById("members-feedback-error");
    const successBox = document.getElementById("members-feedback-success");

    if (errorBox) {
        errorBox.textContent = "";
        errorBox.classList.add("hidden");
    }

    if (successBox) {
        successBox.textContent = "";
        successBox.classList.add("hidden");
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}