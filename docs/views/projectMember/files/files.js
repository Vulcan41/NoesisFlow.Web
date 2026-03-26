import { supabase } from "../../../core/supabase.js";

let currentProject = null;
let currentFolderId = null;
let currentFolderName = "General Files";

export async function initFiles(project) {
    if (!project) return;

    currentProject = project;

    const ready = await loadDefaultFolder();
    if (!ready) return;

    renderCurrentFolderLabel();
    await loadFolderContent();
}

/* =========================
   DEFAULT FOLDER
========================= */

async function loadDefaultFolder() {
    const list = document.getElementById("files-list");
    const countEl = document.getElementById("files-count");

    const { data, error } = await supabase
        .from("project_folders")
        .select("id, name")
        .eq("project_id", currentProject.id)
        .eq("is_default", true)
        .single();

    if (error || !data) {
        console.error("Failed to load default folder:", error);
        if (list) {
            list.innerHTML = `<div class="files-empty">Failed to load folder</div>`;
        }
        if (countEl) {
            countEl.textContent = "0 items";
        }
        return false;
    }

    currentFolderId = data.id;
    currentFolderName = data.name || "General Files";
    return true;
}

function renderCurrentFolderLabel() {
    const el = document.getElementById("files-current-folder");
    if (!el) return;

    el.textContent = `Folder: ${currentFolderName}`;
}

/* =========================
   LOAD FOLDER CONTENT
========================= */

async function loadFolderContent() {
    const list = document.getElementById("files-list");
    const countEl = document.getElementById("files-count");

    if (!list || !currentFolderId) return;

    list.innerHTML = `<div class="files-empty">Loading files...</div>`;

    const [{ data: folders, error: foldersError }, { data: files, error: filesError }] =
    await Promise.all([
        supabase
            .from("project_folders")
            .select("*")
            .eq("project_id", currentProject.id)
            .eq("parent_folder_id", currentFolderId)
            .order("created_at", { ascending: true }),

        supabase
            .from("project_files")
            .select("*")
            .eq("project_id", currentProject.id)
            .eq("folder_id", currentFolderId)
            .eq("status", "ready")
            .eq("visibility", "public")
            .order("created_at", { ascending: false })
    ]);

    if (foldersError || filesError) {
        console.error("Folder content load error:", foldersError || filesError);
        list.innerHTML = `<div class="files-empty">Error loading files</div>`;
        if (countEl) countEl.textContent = "0 items";
        return;
    }

    const safeFolders = folders ?? [];
    const safeFiles = files ?? [];
    const totalItems = safeFolders.length + safeFiles.length;

    if (countEl) {
        countEl.textContent = `${totalItems} ${totalItems === 1 ? "item" : "items"}`;
    }

    if (!totalItems) {
        list.innerHTML = `<div class="files-empty">No items in ${escapeHtml(currentFolderName)}</div>`;
        return;
    }

    list.innerHTML = "";

    safeFolders.forEach((folder) => list.appendChild(createFolderRow(folder)));
    safeFiles.forEach((file) => list.appendChild(createFileRow(file)));
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
   ROWS
========================= */

function createFolderRow(folder) {
    const row = document.createElement("div");
    row.className = "file-row file-row-folder";

    const main = document.createElement("div");
    main.className = "file-main";

    const icon = document.createElement("div");
    icon.className = "file-icon";

    const img = document.createElement("img");
    img.src = "assets/folder.png";
    img.alt = "folder";
    img.className = "file-icon-img";
    icon.appendChild(img);

    const metaWrap = document.createElement("div");
    metaWrap.className = "file-meta-wrap";

    const name = document.createElement("div");
    name.className = "file-name";
    name.textContent = folder.name;
    name.title = folder.name;

    const sub = document.createElement("div");
    sub.className = "file-sub";
    sub.textContent = "Folder";

    metaWrap.appendChild(name);
    metaWrap.appendChild(sub);

    main.appendChild(icon);
    main.appendChild(metaWrap);

    row.appendChild(main);

    return row;
}

function createFileRow(file) {
    const row = document.createElement("div");
    row.className = "file-row";

    const main = document.createElement("div");
    main.className = "file-main";

    const icon = document.createElement("div");
    icon.className = "file-icon";

    const img = document.createElement("img");
    img.src = getFileIcon(file);
    img.alt = "file";
    img.className = "file-icon-img";
    icon.appendChild(img);

    const metaWrap = document.createElement("div");
    metaWrap.className = "file-meta-wrap";

    const name = document.createElement("div");
    name.className = "file-name";
    name.textContent = file.filename;
    name.title = file.filename;

    const sub = document.createElement("div");
    sub.className = "file-sub";
    sub.textContent = `${formatSize(file.size_bytes)} • ${formatDate(file.created_at)}`;

    metaWrap.appendChild(name);
    metaWrap.appendChild(sub);

    main.appendChild(icon);
    main.appendChild(metaWrap);

    const actions = document.createElement("div");
    actions.className = "file-actions";

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

    row.appendChild(main);
    row.appendChild(actions);

    return row;
}

/* =========================
   HELPERS
========================= */

function getFileIcon(file) {
    const mime = (file.mime_type || "").toLowerCase();
    const name = (file.filename || "").toLowerCase();

    if (mime.startsWith("image/")) return "assets/icon_jpg.png";
    if (mime === "application/pdf" || name.endsWith(".pdf")) return "assets/icon_pdf.png";

    if (mime.startsWith("video/")) return "assets/logo_5.png";
    if (mime.startsWith("audio/")) return "assets/logo_5.png";

    if (
    name.endsWith(".zip") ||
    name.endsWith(".rar") ||
    name.endsWith(".7z")
    ) return "assets/logo_5.png";

    if (
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".txt")
    ) return "assets/logo_5.png";

    return "assets/logo_5.png";
}

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(dateString) {
    if (!dateString) return "Unknown date";

    const date = new Date(dateString);

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}