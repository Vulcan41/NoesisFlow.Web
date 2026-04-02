/* =========================
   PUBLIC API
========================= */

export function renderMessages({
    messagesArea,
    messages,
    currentUserId,
    renderMessageContent,
    formatMessageTime,
    getMessageDayKey,
    formatMessageDayLabel,
    isImageAttachment,
    createImageAttachmentCard,
    createFileAttachmentCard,
    scheduleScrollToBottom
}) {
    if (!messagesArea) return;

    messagesArea.innerHTML = "";

    const sortedMessages = [...messages].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    let lastDayKey = null;

    sortedMessages.forEach((message, index) => {
        const currentDayKey = getMessageDayKey(message.created_at);

        if (currentDayKey !== lastDayKey) {
            const dividerRow = document.createElement("div");
            dividerRow.className = "chat-day-divider-row";
            dividerRow.dataset.dayKey = currentDayKey;

            const divider = document.createElement("div");
            divider.className = "chat-day-divider";
            divider.textContent = formatMessageDayLabel(message.created_at);

            dividerRow.appendChild(divider);
            messagesArea.appendChild(dividerRow);

            lastDayKey = currentDayKey;
        }

        renderSingleRealMessage({
            messagesArea,
            message,
            index,
            messages: sortedMessages,
            currentUserId,
            renderMessageContent,
            formatMessageTime,
            isImageAttachment,
            createImageAttachmentCard,
            createFileAttachmentCard,
            getMessageDayKey
        });
    });

    scheduleScrollToBottom(true);
}

export function appendMessage({
    messagesArea,
    message,
    messages = [],
    currentUserId,
    renderMessageContent,
    formatMessageTime,
    getMessageDayKey,
    formatMessageDayLabel,
    isImageAttachment,
    createImageAttachmentCard,
    createFileAttachmentCard,
    scheduleScrollToBottom
}) {
    if (!messagesArea) return;

    const currentDayKey = getMessageDayKey(message.created_at);

    let lastDayKey = null;
    const existingDividers = messagesArea.querySelectorAll(".chat-day-divider-row");

    if (existingDividers.length) {
        const lastDivider = existingDividers[existingDividers.length - 1];
        lastDayKey = lastDivider.dataset.dayKey || null;
    }

    if (currentDayKey !== lastDayKey) {
        const dividerRow = document.createElement("div");
        dividerRow.className = "chat-day-divider-row";
        dividerRow.dataset.dayKey = currentDayKey;

        const divider = document.createElement("div");
        divider.className = "chat-day-divider";
        divider.textContent = formatMessageDayLabel(message.created_at);

        dividerRow.appendChild(divider);
        messagesArea.appendChild(dividerRow);
    }

    const index = messages.findIndex((m) => m.id === message.id);
    const safeIndex = index >= 0 ? index : messages.length - 1;

    renderSingleRealMessage({
        messagesArea,
        message,
        index: safeIndex,
        messages,
        currentUserId,
        renderMessageContent,
        formatMessageTime,
        isImageAttachment,
        createImageAttachmentCard,
        createFileAttachmentCard,
        getMessageDayKey
    });

    scheduleScrollToBottom();
}

/* =========================
   REAL MESSAGE RENDERING
========================= */

function renderSingleRealMessage({
    messagesArea,
    message,
    index,
    messages,
    currentUserId,
    renderMessageContent,
    formatMessageTime,
    isImageAttachment,
    createImageAttachmentCard,
    createFileAttachmentCard,
    getMessageDayKey
}) {
    const isOwn = message.sender_id === currentUserId;
    const hasText = message.content && message.content.trim();
    const hasAttachments = message.attachments && message.attachments.length > 0;

    const groupPosition = getMessageGroupPosition(messages, index, getMessageDayKey);
    const showTime = shouldShowTimeForMessage(messages, index, getMessageDayKey);

    if (hasText) {
        const row = document.createElement("div");
        row.className = `message-row ${isOwn ? "own" : "other"} message-row-${groupPosition}`;

        const stack = document.createElement("div");
        stack.className = "message-stack";

        const bubble = document.createElement("div");
        bubble.className = `message-bubble message-bubble-${groupPosition}`;

        const content = document.createElement("div");
        content.className = "message-content";
        renderMessageContent(content, message.content);

        bubble.appendChild(content);
        stack.appendChild(bubble);

        if (showTime) {
            const time = document.createElement("div");
            time.className = "message-time";
            time.textContent = formatMessageTime(message.created_at);
            stack.appendChild(time);
        }

        row.appendChild(stack);
        messagesArea.appendChild(row);
    }

    if (hasAttachments) {
        const row = document.createElement("div");
        row.className = `message-row ${isOwn ? "own" : "other"} message-row-${groupPosition}`;

        const stack = document.createElement("div");
        stack.className = "message-stack";

        const bubble = document.createElement("div");
        bubble.className = `message-bubble message-bubble-attachment-only message-bubble-${groupPosition}`;

        const contentWrap = document.createElement("div");
        contentWrap.className = "message-attachment-content";

        renderMessageAttachments(
            contentWrap,
            message.attachments,
            isImageAttachment,
            createImageAttachmentCard,
            createFileAttachmentCard
        );

        bubble.appendChild(contentWrap);
        stack.appendChild(bubble);

        if (showTime) {
            const time = document.createElement("div");
            time.className = "message-time";
            time.textContent = formatMessageTime(message.created_at);
            stack.appendChild(time);
        }

        row.appendChild(stack);
        messagesArea.appendChild(row);
    }
}

/* =========================
   ATTACHMENTS
========================= */

function renderMessageAttachments(
container,
attachments,
isImageAttachment,
createImageAttachmentCard,
createFileAttachmentCard
) {
    if (!attachments.length) return;

    const images = attachments.filter(isImageAttachment);
    const files = attachments.filter((a) => !isImageAttachment(a));

    if (images.length) {
        const grid = createMessageImageGrid(images, createImageAttachmentCard);
        container.appendChild(grid);
    }

    if (files.length) {
        const list = createAttachmentList();

        files.forEach((attachment) => {
            list.appendChild(createFileAttachmentCard(attachment));
        });

        container.appendChild(list);
    }
}

function createAttachmentList() {
    const wrap = document.createElement("div");
    wrap.className = "message-attachments";
    return wrap;
}

function createMessageImageGrid(images, createImageAttachmentCard) {
    const grid = document.createElement("div");
    grid.className = "message-image-grid";

    if (images.length === 1) grid.classList.add("one");
    else if (images.length === 2) grid.classList.add("two");
    else if (images.length === 3) grid.classList.add("three");
    else grid.classList.add("multi");

    images.forEach((attachment, index) => {
        const node = createImageAttachmentCard(attachment, images, index);
        node.classList.add("message-image-grid-item");
        grid.appendChild(node);
    });

    return grid;
}

/* =========================
   GROUPING + TIME
========================= */

function shouldGroupMessages(first, second, getMessageDayKey) {
    if (!first || !second) return false;
    if (first.sender_id !== second.sender_id) return false;

    if (
    getMessageDayKey(first.created_at) !==
    getMessageDayKey(second.created_at)
    ) return false;

    const diff = new Date(second.created_at) - new Date(first.created_at);
    return diff >= 0 && diff <= 5 * 60 * 1000;
}

function getMessageGroupPosition(messages, index, getMessageDayKey) {
    const prev = messages[index - 1];
    const next = messages[index + 1];

    const prevGroup = shouldGroupMessages(prev, messages[index], getMessageDayKey);
    const nextGroup = shouldGroupMessages(messages[index], next, getMessageDayKey);

    if (prevGroup && nextGroup) return "middle";
    if (prevGroup) return "end";
    if (nextGroup) return "start";
    return "single";
}

function shouldShowTimeForMessage(messages, index, getMessageDayKey) {
    const current = messages[index];
    const next = messages[index + 1];

    if (!current) return false;
    if (!next) return true;

    return !shouldGroupMessages(current, next, getMessageDayKey);
}