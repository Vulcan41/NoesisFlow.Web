export function initComposer({ onSend, onFilesSelected }) {
    const input = document.getElementById("chat-input");
    const sendBtn = document.getElementById("chat-send-btn");

    const attachBtn = document.querySelector(".text-tool-attach");
    const imageBtn = document.querySelector(".text-tool-image");
    const emojiBtn = document.querySelector(".text-tool-emoji");

    const attachInput = document.getElementById("chat-attach-input");
    const imageInput = document.getElementById("chat-image-input");
    const inputArea = document.getElementById("chat-input-area");

    if (!input) return;

    // =========================
    // AUTO RESIZE
    // =========================
    const resize = () => {
        input.style.height = "24px";
        input.style.height = `${Math.min(input.scrollHeight, 48)}px`;

        input.style.overflowY =
        input.scrollHeight > 48 ? "auto" : "hidden";
    };

    input.addEventListener("input", resize);
    resize();

    // =========================
    // SEND MESSAGE
    // =========================
    const handleSendClick = async () => {
        const text = input.value.trim();

        const didSend = await onSend?.(text);

        if (didSend !== false) {
            input.value = "";
            resize();
        }
    };

    if (sendBtn) {
        sendBtn.onclick = handleSendClick;
    }

    input.addEventListener("keydown", async (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            await handleSendClick();
        }
    });

    // =========================
    // BUTTONS
    // =========================
    attachBtn?.addEventListener("click", () => {
        attachInput?.click();
    });

    imageBtn?.addEventListener("click", () => {
        imageInput?.click();
    });

    emojiBtn?.addEventListener("click", () => {
        input.value += "😊";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
    });

    // =========================
    // FILE INPUTS
    // =========================
    attachInput?.addEventListener("change", () => {
        if (attachInput.files.length) {
            onFilesSelected?.(attachInput.files);
        }
        attachInput.value = "";
    });

    imageInput?.addEventListener("change", () => {
        if (imageInput.files.length) {
            onFilesSelected?.(imageInput.files);
        }
        imageInput.value = "";
    });

    // =========================
    // DRAG & DROP
    // =========================
    if (!inputArea) return;

    let dragCounter = 0;

    const hasFiles = (e) =>
    Array.from(e.dataTransfer?.types || []).includes("Files");

    const clearDrag = () => {
        dragCounter = 0;
        inputArea.classList.remove("drag-over");
    };

    inputArea.addEventListener("dragenter", (e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragCounter++;
        inputArea.classList.add("drag-over");
    });

    inputArea.addEventListener("dragover", (e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
    });

    inputArea.addEventListener("dragleave", (e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragCounter--;
        if (dragCounter <= 0) clearDrag();
    });

    inputArea.addEventListener("drop", (e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        clearDrag();

        const files = Array.from(e.dataTransfer.files || []);
        if (files.length) {
            onFilesSelected?.(files);
        }
    });
}