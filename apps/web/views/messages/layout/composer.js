export function initComposer({ onSend, onFilesSelected }) {
    const elements = getComposerElements();

    if (!elements.input) return;

    setupAutoResize(elements.input);
    setupSendMessage(elements, onSend);
    setupToolButtons(elements);
    setupFileInputs(elements, onFilesSelected);
    setupDragAndDrop(elements.inputArea, onFilesSelected);
}

/* =========================
   ELEMENTS
========================= */

function getComposerElements() {
    return {
        input: document.getElementById("chat-input"),
        sendBtn: document.getElementById("chat-send-btn"),
        attachBtn: document.querySelector(".text-tool-attach"),
        imageBtn: document.querySelector(".text-tool-image"),
        emojiBtn: document.querySelector(".text-tool-emoji"),
        attachInput: document.getElementById("chat-attach-input"),
        imageInput: document.getElementById("chat-image-input"),
        inputArea: document.getElementById("chat-input-area")
    };
}

/* =========================
   AUTO RESIZE
========================= */

function setupAutoResize(input) {
    if (!input) return;

    const resize = () => {
        input.style.height = "24px";
        input.style.height = `${Math.min(input.scrollHeight, 48)}px`;
        input.style.overflowY = input.scrollHeight > 48 ? "auto" : "hidden";
    };

    input.addEventListener("input", resize);
    resize();
}

/* =========================
   SEND MESSAGE
========================= */

function setupSendMessage(elements, onSend) {
    const { input, sendBtn } = elements;
    if (!input) return;

    const resizeAfterClear = () => {
        input.style.height = "24px";
        input.style.height = `${Math.min(input.scrollHeight, 48)}px`;
        input.style.overflowY = input.scrollHeight > 48 ? "auto" : "hidden";
    };

    const handleSendClick = async () => {
        const text = input.value.trim();
        const didSend = await onSend?.(text);

        if (didSend !== false) {
            input.value = "";
            resizeAfterClear();
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
}

/* =========================
   TOOL BUTTONS
========================= */

function setupToolButtons(elements) {
    const {
        input,
        attachBtn,
        imageBtn,
        emojiBtn,
        attachInput,
        imageInput
    } = elements;

    attachBtn?.addEventListener("click", () => {
        attachInput?.click();
    });

    imageBtn?.addEventListener("click", () => {
        imageInput?.click();
    });

    emojiBtn?.addEventListener("click", () => {
        if (!input) return;

        input.value += "😊";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
    });
}

/* =========================
   FILE INPUTS
========================= */

function setupFileInputs(elements, onFilesSelected) {
    const { attachInput, imageInput } = elements;

    attachInput?.addEventListener("change", () => {
        if (attachInput.files?.length) {
            onFilesSelected?.(attachInput.files);
        }
        attachInput.value = "";
    });

    imageInput?.addEventListener("change", () => {
        if (imageInput.files?.length) {
            onFilesSelected?.(imageInput.files);
        }
        imageInput.value = "";
    });
}

/* =========================
   DRAG & DROP
========================= */

function setupDragAndDrop(inputArea, onFilesSelected) {
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

        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length) {
            onFilesSelected?.(files);
        }
    });
}