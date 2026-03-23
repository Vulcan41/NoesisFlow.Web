import { supabase } from "../../../core/supabase.js";
import { loadView } from "../../../core/router.js";
import { DEFAULT_AVATAR } from "../../../state/userStore.js";

let currentProject = null;

export async function initMembers(project) {
    if (!project?.id) {
        console.error("No project provided to members view.");
        return;
    }

    currentProject = project;

    const list = document.getElementById("members-list");
    if (!list) return;

    if (project.members_can_view_members === false) {
        list.innerHTML = `
            <div class="member-empty">
                The owner has hidden the members list for this project.
            </div>
        `;
        return;
    }

    await loadMembers(project.id);
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
            created_at,
            profiles (
                id,
                username,
                full_name,
                avatar_url
            )
        `)
        .eq("project_id", projectId)
        .eq("membership_status", "active")
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error loading project members:", error);
        list.innerHTML = `
            <div class="member-empty">
                Members are not available.
            </div>
        `;
        return;
    }

    if (!data || data.length === 0) {
        list.innerHTML = `
            <div class="member-empty">
                No members found.
            </div>
        `;
        return;
    }

    list.innerHTML = `
        <div class="members-group">
            <div class="members-group-title">Members</div>
            <div class="members-group-list">
                ${data.map(renderMemberRow).join("")}
            </div>
        </div>
    `;

    bindMemberAvatarFallbacks();
    bindMemberProfileLinks();
}

function renderMemberRow(member) {
    const username = member.profiles?.username ?? "user";
    const fullName = member.profiles?.full_name || username || "Unknown user";
    const avatarUrl = member.profiles?.avatar_url?.trim() || DEFAULT_AVATAR;

    return `
        <div class="member-row" data-member-id="${member.id}">
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
                <span class="member-pill member-pill-role">
                    ${escapeHtml(member.role)}
                </span>

                <span class="member-pill member-pill-status">
                    active
                </span>
            </div>
        </div>
    `;
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

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}