import { DEFAULT_AVATAR } from "../../../state/userStore.js";
import { loadView } from "../../../core/router.js";

/* =========================
   PUBLIC API
========================= */

export function renderChatHeader({
    container,
    conversation,
    labels = {}
}) {
    if (!container || !conversation) return;

    const {
        fullName,
        username,
        avatarUrl,
        userId
    } = conversation;

    const {
        viewProfile = "View profile"
    } = labels;

    container.innerHTML = createHeaderMarkup({
        fullName,
        username,
        avatarUrl,
        viewProfile
    });

    setupHeaderBehavior(container, userId);
}

/* =========================
   MARKUP
========================= */

function createHeaderMarkup({
    fullName,
    username,
    avatarUrl,
    viewProfile
}) {
    return `
        <div class="chat-header">
            <div class="chat-user-link">

                <img
                    class="chat-header-avatar"
                    src="${avatarUrl || DEFAULT_AVATAR}"
                />

                <div class="chat-header-text">
                    <div class="chat-header-name">${fullName}</div>
                    <div class="chat-header-username">@${username}</div>
                </div>

                <div class="chat-user-tooltip">
                    ${viewProfile}
                </div>

            </div>
        </div>
    `;
}

/* =========================
   BEHAVIOR
========================= */

function setupHeaderBehavior(container, userId) {
    const avatar = container.querySelector(".chat-header-avatar");
    const userLink = container.querySelector(".chat-user-link");
    const tooltip = container.querySelector(".chat-user-tooltip");

    if (avatar) {
        avatar.onerror = () => {
            avatar.src = DEFAULT_AVATAR;
        };
    }

    if (userLink && tooltip) {
        userLink.addEventListener("mouseenter", () => {
            tooltip.classList.add("tooltip-visible");
        });

        userLink.addEventListener("mouseleave", () => {
            tooltip.classList.remove("tooltip-visible");
        });
    }

    if (userLink && userId) {
        userLink.addEventListener("click", () => {
            loadView("profileOther", userId);
        });
    }
}