import { supabase } from "../../core/supabase.js";
import { loadView } from "../../core/router.js";

export async function initProjectOther(projectId) {
    setupBackButton();

    if (!projectId) {
        showError("Δεν βρέθηκε project id.");
        return;
    }

    await loadProject(projectId);
}

function setupBackButton() {
    const backBtn = document.getElementById("project-other-back-btn");
    if (!backBtn) return;

    backBtn.onclick = () => {
        loadView("basic");
    };
}

async function loadProject(projectId) {
    const { data, error } = await supabase
        .from("projects")
        .select("id, name, description, visibility, status, owner_id, created_at, avatar_url")
        .eq("id", projectId)
        .single();

    if (error) {
        console.error("Error loading projectOther:", error);
        showError("Αποτυχία φόρτωσης project.");
        return;
    }

    if (!data) {
        showError("Το project δεν βρέθηκε.");
        return;
    }

    await renderProject(data);
    await setupRequestButton(data.id, data.visibility);
}

async function renderProject(project) {
    const title = document.getElementById("project-other-title");
    const description = document.getElementById("project-other-description");
    const visibility = document.getElementById("project-other-visibility");
    const status = document.getElementById("project-other-status");
    const owner = document.getElementById("project-other-owner");
    const meta = document.getElementById("project-other-meta");
    const avatar = document.getElementById("project-other-avatar");
    const created = document.getElementById("project-other-created");

    if (title) {
        title.textContent = project.name ?? "Untitled project";
    }

    if (description) {
        description.textContent = project.description || "Χωρίς περιγραφή.";
    }

    if (visibility) {
        visibility.textContent = project.visibility;
        visibility.className = `project-other-pill ${
            project.visibility === "public"
                ? "project-other-pill-public"
                : "project-other-pill-private"
        }`;
    }

    if (status) {
        status.textContent = project.status ?? "active";
    }

    if (created) {
        created.textContent = formatCreatedAt(project.created_at);
    }

    if (avatar) {
        avatar.innerHTML = project.avatar_url
        ? `<img src="${escapeHtml(project.avatar_url)}" alt="${escapeHtml(project.name || "Project")} avatar" />`
        : `<span class="project-other-avatar-fallback">${escapeHtml((project.name || "P").charAt(0).toUpperCase())}</span>`;
    }

    if (owner && project.owner_id) {
        const { data: ownerProfile, error: ownerError } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", project.owner_id)
            .single();

        if (ownerError) {
            console.error("Owner load error:", ownerError);
            owner.textContent = "by @unknown";
        } else {
            owner.textContent = `by @${ownerProfile?.username || "user"}`;
        }
    }

    if (meta) {
        meta.classList.remove("hidden");
    }
}

async function setupRequestButton(projectId, projectVisibility) {
    const button = document.getElementById("project-request-btn");
    const message = document.getElementById("project-request-message");

    if (!button || !message) return;

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError) {
        console.error("Error getting user:", userError);
        button.disabled = true;
        message.textContent = "Αποτυχία φόρτωσης χρήστη.";
        message.classList.remove("hidden");
        return;
    }

    if (!user) {
        button.disabled = true;
        message.textContent = "Πρέπει να συνδεθείτε για να ζητήσετε συμμετοχή.";
        message.classList.remove("hidden");
        return;
    }

    if (projectVisibility !== "public") {
        button.disabled = true;
        button.textContent = "Private project";
        message.textContent = "Δεν μπορείτε να ζητήσετε συμμετοχή σε private project.";
        message.classList.remove("hidden");
        return;
    }

    button.disabled = false;
    button.textContent = "Request to join";
    message.classList.add("hidden");
    message.textContent = "";

    button.onclick = async () => {
        button.disabled = true;
        message.classList.add("hidden");
        message.textContent = "";

        const { data, error } = await supabase.rpc("request_to_join_project", {
            p_project_id: projectId
        });

        if (error) {
            console.error("Request to join failed:", error);
            button.disabled = false;
            message.textContent = error.message || "Αποτυχία αποστολής αιτήματος.";
            message.classList.remove("hidden");
            return;
        }

        if (data === "owner") {
            button.disabled = true;
            button.textContent = "Owner";
            message.textContent = "Είστε ο owner αυτού του project.";
            message.classList.remove("hidden");
            return;
        }

        if (data === "already_member") {
            button.disabled = true;
            button.textContent = "Already a member";
            message.textContent = "Είστε ήδη μέλος αυτού του project.";
            message.classList.remove("hidden");
            return;
        }

        if (data === "already_pending") {
            button.disabled = true;
            button.textContent = "Request pending";
            message.textContent = "Το αίτημά σας εκκρεμεί.";
            message.classList.remove("hidden");
            return;
        }

        if (data === "requested") {
            button.disabled = true;
            button.textContent = "Request pending";
            message.textContent = "Το αίτημά σας στάλθηκε.";
            message.classList.remove("hidden");
            return;
        }

        button.disabled = false;
        message.textContent = "Απρόβλεπτη απάντηση από τον server.";
        message.classList.remove("hidden");
    };
}

function formatCreatedAt(dateString) {
    if (!dateString) return "created recently";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "created recently";
    }

    const formatted = date.toLocaleDateString("el-GR", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

    return "created " + formatted;
}

function showError(message) {
    const errorBox = document.getElementById("project-other-error");
    if (!errorBox) return;

    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}