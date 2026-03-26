import { supabase } from "../../../core/supabase.js";

let currentProject = null;

export function initFiles(project) {
    if (!project) return;

    currentProject = project;

    loadFiles();
}

/* =========================
   LOAD FILES
========================= */

async function loadFiles() {
    const list = document.getElementById("files-list");
    if (!list) return;

    list.innerHTML = `<div class="files-empty">Loading...</div>`;

    const { data, error } = await supabase
        .from("project_files")
        .select("*")
        .eq("project_id", currentProject.id)
        .eq("status", "ready")
        .eq("visibility", "public") // 👈 members only see public
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        list.innerHTML = `<div class="files-empty">Error loading files</div>`;
        return;
    }

    if (!data.length) {
        list.innerHTML = `<div class="files-empty">No files yet</div>`;
        return;
    }

    list.innerHTML = "";
    data.forEach(file => list.appendChild(createRow(file)));
}

/* =========================
   AUTH HEADERS
========================= */

async function getAuthHeaders() {
    const {
        data: { session }
    } = await supabase.auth.getSession();

    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token || ""}`
    };
}

/* =========================
   ROW
========================= */

function createRow(file) {
    const row = document.createElement("div");
    row.className = "file-row";

    const left = document.createElement("div");

    const name = document.createElement("div");
    name.className = "file-name";
    name.textContent = file.filename;

    const meta = document.createElement("div");
    meta.className = "file-meta";
    meta.textContent = formatSize(file.size_bytes);

    left.appendChild(name);
    left.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "file-actions";

    /* DOWNLOAD */

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "file-btn file-btn-download";
    downloadBtn.textContent = "Download";

    downloadBtn.onclick = async () => {
        try {
            const headers = await getAuthHeaders();

            const res = await fetch("/api/project-files/download-url", {
                method: "POST",
                headers,
                body: JSON.stringify({ fileId: file.id })
            });

            if (!res.ok) {
                throw new Error("Failed to get download URL");
            }

            const { downloadUrl } = await res.json();
            window.open(downloadUrl, "_blank");

        } catch (err) {
            console.error("Download error:", err);
            alert("Download failed");
        }
    };

    actions.appendChild(downloadBtn);

    row.appendChild(left);
    row.appendChild(actions);

    return row;
}

/* =========================
   HELPERS
========================= */

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}