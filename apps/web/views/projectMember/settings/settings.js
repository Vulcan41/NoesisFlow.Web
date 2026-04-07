import { supabase } from "../../../core/supabase.js";
import { loadView } from "../../../core/router.js";

let currentProject = null;

export function initSettings(project) {
    if (!project) return;

    currentProject = project;
    clearFeedback();
    setupLeaveButton();
}

function setupLeaveButton() {
    const button = document.getElementById("project-member-leave-btn");
    if (!button) return;

    button.onclick = async () => {
        if (!currentProject?.id) return;

        const confirmed = window.confirm(
            `Leave project "${currentProject.name}"?`
        );

        if (!confirmed) return;

        clearFeedback();
        button.disabled = true;
        button.textContent = "Leaving...";

        try {
            const { data, error } = await supabase.rpc("leave_project", {
                p_project_id: currentProject.id
            });

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error("Membership row was not removed.");
            }

            loadView("basic");
        } catch (error) {
            console.error("Leave project failed:", error);
            showError(error?.message || "Failed to leave project.");
            button.disabled = false;
            button.textContent = "Leave Project";
        }
    };
}

function showError(message) {
    const errorBox = document.getElementById("project-member-settings-error");
    const successBox = document.getElementById("project-member-settings-success");

    if (successBox) {
        successBox.textContent = "";
        successBox.classList.add("hidden");
    }

    if (!errorBox) return;

    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function clearFeedback() {
    const errorBox = document.getElementById("project-member-settings-error");
    const successBox = document.getElementById("project-member-settings-success");

    if (errorBox) {
        errorBox.textContent = "";
        errorBox.classList.add("hidden");
    }

    if (successBox) {
        successBox.textContent = "";
        successBox.classList.add("hidden");
    }
}