import { supabase } from "../../../core/supabase.js";
import { loadView } from "../../../core/router.js";

const PROJECT_AVATAR_BUCKET = "project-avatars";

let currentProject = null;
let selectedAvatarFile = null;
let objectPreviewUrl = null;

export function initSettings(project) {
    if (!project) return;

    currentProject = project;
    selectedAvatarFile = null;

    fillProjectSettingsForm(project);
    setupAvatarInput();
    setupFormSubmit();
    setupDeleteButton();
}

/* =========================
   INITIAL LOAD
========================= */

function fillProjectSettingsForm(project) {
    const nameInput = document.getElementById("project-settings-name");
    const descriptionInput = document.getElementById("project-settings-description");

    if (nameInput) {
        nameInput.value = project.name ?? "";
    }

    if (descriptionInput) {
        descriptionInput.value = project.description ?? "";
    }

    const visibilityValue = project.visibility || "public";
    const visibilityInput = document.querySelector(
        `input[name="project-settings-visibility"][value="${visibilityValue}"]`
    );

    if (visibilityInput) {
        visibilityInput.checked = true;
    }

    renderAvatarPreview(project.avatar_url, project.name);
    clearFeedback();
}

/* =========================
   AVATAR
========================= */

function setupAvatarInput() {
    const fileInput = document.getElementById("project-settings-avatar-input");
    const uploadLabel = document.getElementById("project-avatar-upload");

    if (!fileInput || !uploadLabel) return;

    fileInput.onchange = () => {
        const file = fileInput.files?.[0];
        if (!file) return;

        selectedAvatarFile = file;

        if (objectPreviewUrl) {
            URL.revokeObjectURL(objectPreviewUrl);
        }

        objectPreviewUrl = URL.createObjectURL(file);
        renderAvatarPreview(objectPreviewUrl, getProjectNameInputValue());
    };
}

function renderAvatarPreview(imageUrl, projectName) {
    const preview = document.getElementById("project-settings-avatar-preview");
    if (!preview) return;

    const safeLetter = escapeHtml((projectName || "P").charAt(0).toUpperCase());

    if (imageUrl) {
        preview.innerHTML = `
            <img
                src="${escapeHtml(imageUrl)}"
                alt="${escapeHtml(projectName || "project")} avatar"
            />
        `;
        return;
    }

    preview.innerHTML = `
        <span class="project-settings-avatar-fallback">${safeLetter}</span>
    `;
}

/* =========================
   SAVE
========================= */

function setupFormSubmit() {
    const form = document.getElementById("project-settings-form");
    if (!form) return;

    form.onsubmit = async (event) => {
        event.preventDefault();

        if (!currentProject?.id) return;

        clearFeedback();
        setSubmitting(true);

        try {
            const name = getProjectNameInputValue();
            const description =
            document.getElementById("project-settings-description")?.value.trim() || "";
            const visibility =
            document.querySelector('input[name="project-settings-visibility"]:checked')?.value ||
            "public";

            if (!name) {
                showError("Project name is required.");
                setSubmitting(false);
                return;
            }

            let avatarUrl = currentProject.avatar_url ?? null;

            if (selectedAvatarFile) {
                avatarUrl = await uploadProjectAvatar(currentProject.id, selectedAvatarFile);
            }

            const { error } = await supabase
                .from("projects")
                .update({
                name,
                description: description || null,
                visibility,
                avatar_url: avatarUrl
            })
                .eq("id", currentProject.id);

            if (error) {
                throw error;
            }

            currentProject = {
                ...currentProject,
                name,
                description,
                visibility,
                avatar_url: avatarUrl
            };

            window.dispatchEvent(
                new CustomEvent("project-updated", {
                    detail: {
                        name,
                        description,
                        visibility,
                        avatar_url: avatarUrl
                    }
                })
            );

            showSuccess("Project updated successfully.");
        } catch (error) {
            console.error("Project update failed:", error);
            showError(error?.message || "Failed to update project.");
        } finally {
            setSubmitting(false);
        }
    };
}

async function uploadProjectAvatar(projectId, file) {
    const extension = file.name.includes(".")
    ? file.name.split(".").pop().toLowerCase()
    : "jpg";

    const filePath = `${projectId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase
        .storage
        .from(PROJECT_AVATAR_BUCKET)
        .upload(filePath, file, {
        upsert: true
    });

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase
        .storage
        .from(PROJECT_AVATAR_BUCKET)
        .getPublicUrl(filePath);

    return data?.publicUrl ?? null;
}

/* =========================
   DELETE
========================= */

function setupDeleteButton() {
    const button = document.getElementById("project-settings-delete-btn");
    if (!button) return;

    button.onclick = async () => {
        if (!currentProject?.id) return;

        const confirmed = window.confirm(
            `Delete project "${currentProject.name}"? This cannot be undone.`
        );

        if (!confirmed) return;

        clearFeedback();
        button.disabled = true;

        try {
            const { error } = await supabase
                .from("projects")
                .delete()
                .eq("id", currentProject.id);

            if (error) {
                throw error;
            }

            loadView("basic");
        } catch (error) {
            console.error("Project delete failed:", error);
            showError(error?.message || "Failed to delete project.");
            button.disabled = false;
        }
    };
}

/* =========================
   HELPERS
========================= */

function getProjectNameInputValue() {
    return document.getElementById("project-settings-name")?.value.trim() || "";
}

function setSubmitting(isSubmitting) {
    const submitBtn = document.getElementById("project-settings-submit-btn");
    const deleteBtn = document.getElementById("project-settings-delete-btn");
    const avatarInput = document.getElementById("project-settings-avatar-input");

    if (submitBtn) {
        submitBtn.disabled = isSubmitting;
        submitBtn.textContent = isSubmitting ? "Saving..." : "Αποθήκευση";
    }

    if (deleteBtn) {
        deleteBtn.disabled = isSubmitting;
    }

    if (avatarInput) {
        avatarInput.disabled = isSubmitting;
    }
}

function showError(message) {
    const errorBox = document.getElementById("project-settings-error");
    const successBox = document.getElementById("project-settings-success");

    if (successBox) {
        successBox.textContent = "";
        successBox.classList.add("hidden");
    }

    if (!errorBox) return;

    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function showSuccess(message) {
    const errorBox = document.getElementById("project-settings-error");
    const successBox = document.getElementById("project-settings-success");

    if (errorBox) {
        errorBox.textContent = "";
        errorBox.classList.add("hidden");
    }

    if (!successBox) return;

    successBox.textContent = message;
    successBox.classList.remove("hidden");
}

function clearFeedback() {
    const errorBox = document.getElementById("project-settings-error");
    const successBox = document.getElementById("project-settings-success");

    if (errorBox) {
        errorBox.textContent = "";
        errorBox.classList.add("hidden");
    }

    if (successBox) {
        successBox.textContent = "";
        successBox.classList.add("hidden");
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}