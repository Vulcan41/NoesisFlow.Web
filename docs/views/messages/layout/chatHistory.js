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
   INTERNAL HELPERS
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
        row.dataset.messageId = message.id;

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
        row.dataset.messageId = message.id;

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

function renderMessageAttachments(
container,
attachments = [],
isImageAttachment,
createImageAttachmentCard,
createFileAttachmentCard
) {
    if (!attachments.length) return;

    const images = attachments.filter(isImageAttachment);
    const files = attachments.filter((a) => !isImageAttachment(a));

    if (images.length) {
        const imageGrid = createMessageImageGrid(
            images,
            createImageAttachmentCard
        );
        container.appendChild(imageGrid);
    }

    if (files.length) {
        const fileList = createAttachmentList();

        files.forEach((attachment) => {
            const node = createFileAttachmentCard(attachment);
            fileList.appendChild(node);
        });

        container.appendChild(fileList);
    }
}

function createAttachmentList() {
    const wrap = document.createElement("div");
    wrap.className = "message-attachments";
    return wrap;
}

function createMessageImageGrid(images = [], createImageAttachmentCard) {
    const grid = document.createElement("div");
    grid.className = "message-image-grid";

    if (images.length === 1) {
        grid.classList.add("one");
    } else if (images.length === 2) {
        grid.classList.add("two");
    } else if (images.length === 3) {
        grid.classList.add("three");
    } else {
        grid.classList.add("multi");
    }

    images.forEach((attachment, index) => {
        const node = createImageAttachmentCard(attachment, images, index);
        node.classList.add("message-image-grid-item");
        grid.appendChild(node);
    });

    return grid;
}

function shouldGroupMessages(firstMessage, secondMessage, getMessageDayKey) {
    if (!firstMessage || !secondMessage) return false;

    if (firstMessage.sender_id !== secondMessage.sender_id) return false;

    const firstDay = getMessageDayKey(firstMessage.created_at);
    const secondDay = getMessageDayKey(secondMessage.created_at);

    if (firstDay !== secondDay) return false;

    const diffMs =
    new Date(secondMessage.created_at) - new Date(firstMessage.created_at);

    return diffMs >= 0 && diffMs <= 5 * 60 * 1000;
}

function getMessageGroupPosition(messages, index, getMessageDayKey) {
    const message = messages[index];
    if (!message) return "single";

    const previousMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

    const groupedWithPrevious = shouldGroupMessages(previousMessage, message, getMessageDayKey);
    const groupedWithNext = shouldGroupMessages(message, nextMessage, getMessageDayKey);

    if (groupedWithPrevious && groupedWithNext) return "middle";
    if (groupedWithPrevious) return "end";
    if (groupedWithNext) return "start";
    return "single";
}

function shouldShowTimeForMessage(messages, index, getMessageDayKey) {
    const currentMessage = messages[index];
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

    if (!currentMessage) return false;
    if (!nextMessage) return true;

    return !shouldGroupMessages(currentMessage, nextMessage, getMessageDayKey);
}