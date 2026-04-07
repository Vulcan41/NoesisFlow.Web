let currentOnSubmit = null;

export function initSetUpProject({ onSubmit }) {
    currentOnSubmit = onSubmit;

    const modal = document.getElementById("setup-project-modal");
    const form = document.getElementById("setup-project-form");
    const closeBtn = document.getElementById("setup-project-close-btn");
    const cancelBtn = document.getElementById("setup-project-cancel-btn");
    const backdrop = modal?.querySelector(".setup-project-backdrop");
    const errorBox = document.getElementById("setup-project-error");
    const nameInput = document.getElementById("setup-project-name");
    const descriptionInput = document.getElementById("setup-project-description");

    if (!modal || !form || !nameInput) return;

    clearError();
    form.reset();
    modal.classList.remove("hidden");

    setTimeout(() => {
        nameInput.focus();
    }, 0);

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    backdrop.onclick = closeModal;

    form.onsubmit = async (event) => {
        event.preventDefault();

        clearError();

        const visibilityInput = form.querySelector('input[name="setup-project-visibility"]:checked');

        const payload = {
            name: nameInput.value.trim(),
            description: descriptionInput?.value.trim() || "",
            visibility: visibilityInput?.value || "public"
        };

        if (!payload.name) {
            showError("Project name is required.");
            return;
        }

        try {
            await currentOnSubmit?.(payload);
            closeModal();
        } catch (error) {
            console.error("Create project failed:", error);
            showError(error?.message || "Failed to create project.");
        }
    };

    document.onkeydown = (event) => {
        if (event.key === "Escape" && !modal.classList.contains("hidden")) {
            closeModal();
        }
    };
}

function closeModal() {
    const modal = document.getElementById("setup-project-modal");
    if (!modal) return;

    modal.classList.add("hidden");
}

function showError(message) {
    const errorBox = document.getElementById("setup-project-error");
    if (!errorBox) return;

    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function clearError() {
    const errorBox = document.getElementById("setup-project-error");
    if (!errorBox) return;

    errorBox.textContent = "";
    errorBox.classList.add("hidden");
}