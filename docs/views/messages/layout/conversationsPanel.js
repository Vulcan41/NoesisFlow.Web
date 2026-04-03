import { DEFAULT_AVATAR } from "../../../state/userStore.js";

export function applyFadeIfOverflow(element) {
    if (!element) return;

    requestAnimationFrame(() => {
        const isOverflowing = element.scrollWidth > element.clientWidth + 1;

        if (isOverflowing) {
            element.classList.add("is-overflowing");
        } else {
            element.classList.remove("is-overflowing");
        }
    });
}

export function renderConversationsPanel({
    container,
    items,
    onConversationClick
}) {
    if (!container) return;

    container.innerHTML = "";

    items.forEach((item) => {
        const row = createConversationRow(item, onConversationClick);
        container.appendChild(row);
    });
}

export function clearConversationSelection(container) {
    if (!container) return;

    container
        .querySelectorAll("#conversations-list > div")
        .forEach((el) => el.classList.remove("selected-conversation"));
}

function createConversationRow(item, onConversationClick) {
    const row = document.createElement("div");
    row.dataset.conversationId = item.conversationId;

    if (item.isSelected) {
        row.classList.add("selected-conversation");
    }

    if (item.isUnread) {
        row.classList.add("unread-conversation");
    }

    const avatar = document.createElement("img");
    avatar.className = "conversation-avatar";
    avatar.src = item.avatarUrl || DEFAULT_AVATAR;
    avatar.onerror = () => {
        avatar.src = DEFAULT_AVATAR;
    };

    const text = document.createElement("div");
    text.className = "conversation-text";

    const name = document.createElement("div");
    name.className = "conversation-name";

    const nameText = document.createElement("span");
    nameText.className = "conversation-name-text";
    nameText.textContent = item.fullName || "User";

    const newBadge = document.createElement("span");
    newBadge.className = "conversation-new-badge";
    newBadge.textContent = item.newBadgeText || "New";
    newBadge.style.display = item.isUnread ? "inline-block" : "none";

    name.appendChild(nameText);
    name.appendChild(newBadge);

    const username = document.createElement("div");
    username.className = "conversation-username";
    username.textContent = `@${item.username || "user"}`;

    const meta = document.createElement("div");
    meta.className = "conversation-meta";
    meta.textContent = item.previewText || "";

    if (item.isUnread) {
        meta.classList.add("unread");
    }

    applyFadeIfOverflow(meta);

    text.appendChild(name);
    text.appendChild(meta);

    row.appendChild(avatar);
    row.appendChild(text);

    row.addEventListener("click", async () => {
        onConversationClick?.(item, row);
    });

    return row;
}