import { supabase } from "../../core/supabase.js";
import { DEFAULT_AVATAR } from "../../state/userStore.js";
import { showInfo } from "../../components/info.js";

let currentConfig = null;

export async function initInviteFriendModal(config) {
    currentConfig = config;

    const modal = document.getElementById("invite-friend-modal");
    const closeBtn = document.getElementById("invite-friend-close-btn");
    const cancelBtn = document.getElementById("invite-friend-cancel-btn");
    const backdrop = modal?.querySelector(".invite-friend-backdrop");

    if (!modal) return;

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
    const listSection = document.getElementById("invite-friend-list-section");

    if (!pendingSection || !listSection) return;

    const membershipByUserId = new Map(
        (currentConfig.currentMembers ?? []).map((member) => [member.user_id, member])
    );

    const pendingInvites = (currentConfig.currentMembers ?? []).filter(
        (member) =>
        member.membership_status === "pending" &&
        member.membership_source === "invite"
    );

    pendingSection.innerHTML = pendingInvites.length
    ? `
            <div class="invite-friend-section">
                <div class="invite-friend-section-title">Pending invites</div>
                <div class="invite-friend-group-list">
                    ${pendingInvites.map(renderPendingInviteRow).join("")}
                </div>
            </div>
        `
    : "";

    const { data: friendships, error: friendshipsError } = await supabase
        .from("friendships")
        .select("requester_id, receiver_id, status")
        .eq("status", "accepted")
        .or(`requester_id.eq.${currentConfig.currentUserId},receiver_id.eq.${currentConfig.currentUserId}`);

    if (friendshipsError) {
        console.error("Failed to load friendships:", friendshipsError);
        listSection.innerHTML = `
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
        listSection.innerHTML = `
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
        listSection.innerHTML = `
            <div class="invite-friend-section">
                <div class="invite-friend-section-title">Invite friends</div>
                <div class="invite-friend-empty">
                    Failed to load friend profiles.
                </div>
            </div>
        `;
        return;
    }

    const inviteableProfiles = (profiles ?? []).filter((profile) => {
        return !membershipByUserId.has(profile.id);
    });

    const sortedProfiles = inviteableProfiles.sort((a, b) => {
        const aName = (a.full_name || a.username || "").toLowerCase();
        const bName = (b.full_name || b.username || "").toLowerCase();
        return aName.localeCompare(bName);
    });

    if (!sortedProfiles.length) {
        listSection.innerHTML = `
            <div class="invite-friend-section">
                <div class="invite-friend-section-title">Invite friends</div>
                <div class="invite-friend-empty">
                    No inviteable friends available.
                </div>
            </div>
        `;
        bindInviteAvatarFallbacks();
        return;
    }

    listSection.innerHTML = `
        <div class="invite-friend-section">
            <div class="invite-friend-section-title">Invite friends</div>
            <div class="invite-friend-group-list">
                ${sortedProfiles.map((profile) => renderInviteFriendRow(profile)).join("")}
            </div>
        </div>
    `;

    bindInviteButtons();
    bindInviteAvatarFallbacks();
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
                <span class="invite-friend-pill">pending</span>
            </div>
        </div>
    `;
}

function renderInviteFriendRow(profile) {
    const username = profile.username ?? "user";
    const fullName = profile.full_name || username || "Unknown user";
    const avatarUrl = profile.avatar_url?.trim() || DEFAULT_AVATAR;

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
                <button
                    class="invite-friend-btn"
                    type="button"
                    data-user-id="${profile.id}"
                >
                    Invite
                </button>
            </div>
        </div>
    `;
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

            await showInfo({
                type: "success",
                message: successMessage
            });

            const nextStatus =
            data === "request_accepted_by_invite" ? "active" : "pending";

            currentConfig.currentMembers = [
                ...(currentConfig.currentMembers ?? []).filter(
                    (member) => member.user_id !== userId
                ),
                {
                    user_id: userId,
                    membership_status: nextStatus,
                    membership_source: "invite"
                }
            ];

            currentConfig.onInviteSuccess?.(successMessage);

            await loadInviteModalContent();
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