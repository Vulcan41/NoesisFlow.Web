// chatHistory.js

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
    messagesArea.innerHTML = "";

    let lastDayKey = null;

    messages.forEach((message) => {
        const currentDayKey = getMessageDayKey(message.created_at);

        if (currentDayKey !== lastDayKey) {
            const dividerRow = document.createElement("div");
            dividerRow.className = "chat-day-divider-row";

            const divider = document.createElement("div");
            divider.className = "chat-day-divider";
            divider.textContent = formatMessageDayLabel(message.created_at);

            dividerRow.appendChild(divider);
            messagesArea.appendChild(dividerRow);

            lastDayKey = currentDayKey;
        }

        renderSingleMessage({
            messagesArea,
            message,
            currentUserId,
            renderMessageContent,
            formatMessageTime,
            isImageAttachment,
            createImageAttachmentCard,
            createFileAttachmentCard
        });
    });

    scheduleScrollToBottom(true);
}

export function appendMessage({
    messagesArea,
    message,
    currentUserId,
    renderMessageContent,
    formatMessageTime,
    isImageAttachment,
    createImageAttachmentCard,
    createFileAttachmentCard,
    scheduleScrollToBottom
}) {
    renderSingleMessage({
        messagesArea,
        message,
        currentUserId,
        renderMessageContent,
        formatMessageTime,
        isImageAttachment,
        createImageAttachmentCard,
        createFileAttachmentCard
    });

    scheduleScrollToBottom();
}

/* =========================
   INTERNAL RENDERERS
========================= */

function renderSingleMessage({
    messagesArea,
    message,
    currentUserId,
    renderMessageContent,
    formatMessageTime,
    isImageAttachment,
    createImageAttachmentCard,
    createFileAttachmentCard
}) {
    const isOwn = message.sender_id === currentUserId;

    const hasText = message.content && message.content.trim();
    const hasAttachments = message.attachments && message.attachments.length > 0;

    if (hasText) {
        const row = document.createElement("div");
        row.className = `message-row ${isOwn ? "own" : "other"}`;

        const bubble = document.createElement("div");
        bubble.className = "message-bubble";

        const content = document.createElement("div");
        content.className = "message-content";
        renderMessageContent(content, message.content);

        const time = document.createElement("div");
        time.className = "message-time";
        time.textContent = formatMessageTime(message.created_at);

        bubble.appendChild(content);
        bubble.appendChild(time);
        row.appendChild(bubble);
        messagesArea.appendChild(row);
    }

    if (hasAttachments) {
        const wrap = document.createElement("div");
        wrap.className = "message-attachments";

        const images = message.attachments.filter(isImageAttachment);
        const files = message.attachments.filter((a) => !isImageAttachment(a));

        if (images.length) {
            images.forEach((a, i) => {
                wrap.appendChild(createImageAttachmentCard(a, images, i));
            });
        }

        if (files.length) {
            files.forEach((a) => {
                wrap.appendChild(createFileAttachmentCard(a));
            });
        }

        const row = document.createElement("div");
        row.className = `message-row ${isOwn ? "own" : "other"}`;

        const bubble = document.createElement("div");
        bubble.className = "message-bubble message-bubble-attachment-only";

        const time = document.createElement("div");
        time.className = "message-time";
        time.textContent = formatMessageTime(message.created_at);

        bubble.appendChild(wrap);
        bubble.appendChild(time);

        row.appendChild(bubble);
        messagesArea.appendChild(row);
    }
}