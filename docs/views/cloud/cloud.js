import { createCancelButton } from "../../components/cancelButton.js";
import { openModal } from "../../components/modal.js";
import {
uploadFile,
listMyFiles,
getDownloadUrl,
deleteFile
} from "../../services/storage/storageApi.js";

export async function initCloud() {

    const fileInput = document.getElementById("fileInput");
    const uploadBtn = document.getElementById("uploadBtn");
    const fileList = document.getElementById("fileList");
    const filesCount = document.getElementById("cloudFilesCount");
    const selectText = document.querySelector(".cloud-upload-select");

    selectText?.addEventListener("click", () => {
        fileInput.click();
    });

    uploadBtn.addEventListener("click", async () => {

        try {

            const file = fileInput.files[0];

            if (!file) {
                alert("Please select a file first.");
                return;
            }

            uploadBtn.disabled = true;
            uploadBtn.textContent = "Uploading...";

            const result = await uploadFile(file);
            console.log("Upload complete:", result);

            fileInput.value = "";

            await refreshFiles();

        } catch (err) {

            console.error(err);
            alert(err.message);

        } finally {

            uploadBtn.disabled = false;
            uploadBtn.textContent = "Upload File";

        }

    });

    async function refreshFiles() {

        const files = await listMyFiles();

        // ✅ NEW: update storage UI
        updateStorageUsage(files);

        fileList.innerHTML = "";

        if (filesCount) {
            filesCount.textContent = `${files.length} ${files.length === 1 ? "αρχείο" : "αρχεία"}`;
        }

        if (!files.length) {
            fileList.innerHTML = `<div class="cloud-empty">Δεν υπάρχουν αρχεία ακόμη.</div>`;
            return;
        }

        for (const file of files) {
            fileList.appendChild(createFileRow(file));
        }

    }

    function updateStorageUsage(files) {

        const storageText = document.getElementById("cloudStorageText");
        const storagePercent = document.getElementById("cloudStoragePercent");
        const storageRing = document.getElementById("cloudStorageRing");

        const totalLimitBytes = 0.5 * 1024 * 1024 * 1024; // 0.5 GB

        const usedBytes = files.reduce((sum, file) => {
            return sum + (Number(file.size_bytes) || 0);
        }, 0);

        const percent = Math.min((usedBytes / totalLimitBytes) * 100, 100);
        const roundedPercent = Math.round(percent);

        if (storageText) {
            storageText.textContent = `${formatFileSize(usedBytes)} / 0.5 GB`;
        }

        if (storagePercent) {
            storagePercent.textContent = `${roundedPercent}%`;
        }

        if (storageRing) {
            storageRing.style.setProperty("--progress", `${percent}%`);
        }
    }

    function createFileRow(file) {

        const row = document.createElement("div");
        row.className = "cloud-file-row";

        const main = document.createElement("div");
        main.className = "cloud-file-main";

        const icon = document.createElement("div");
        icon.className = "cloud-file-icon";
        icon.textContent = getFileIcon(file);

        const meta = document.createElement("div");
        meta.className = "cloud-file-meta";

        const name = document.createElement("div");
        name.className = "cloud-file-name";
        name.textContent = file.filename;
        name.title = file.filename;

        name.addEventListener("click", async () => {
            try {
                const downloadUrl = await getDownloadUrl(file.id);
                window.open(downloadUrl, "_blank");
            } catch (err) {
                console.error(err);
                alert("Failed to open file.");
            }
        });

        const sub = document.createElement("div");
        sub.className = "cloud-file-sub";
        sub.textContent = `${formatFileSize(file.size_bytes)} • ${formatDate(file.created_at)}`;

        meta.appendChild(name);
        meta.appendChild(sub);

        main.appendChild(icon);
        main.appendChild(meta);

        const actions = document.createElement("div");
        actions.className = "cloud-file-actions";

        const deleteBtn = createCancelButton({
            label: "Delete file",
            text: "×",
            onClick: async () => {

                openModal({
                    message: `Delete "${file.filename}"?`,
                    cancelText: "Cancel",
                    confirmText: "Delete",
                    onConfirm: async () => {

                        try {

                            await deleteFile(file.id);
                            await refreshFiles();

                        } catch (err) {

                            console.error(err);
                            alert("Failed to delete file.");

                        }

                    }
                });

            }
        });

        actions.appendChild(deleteBtn);

        row.appendChild(main);
        row.appendChild(actions);

        return row;
    }

    function formatFileSize(bytes) {
        if (bytes == null || isNaN(bytes)) return "Unknown size";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }

    function formatDate(dateString) {
        if (!dateString) return "Unknown date";

        const date = new Date(dateString);

        return date.toLocaleDateString("el-GR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }

    function getFileIcon(file) {

        const mime = (file.mime_type || "").toLowerCase();
        const name = (file.filename || "").toLowerCase();

        if (mime.startsWith("image/")) return "🖼";
        if (mime === "application/pdf" || name.endsWith(".pdf")) return "📄";
        if (mime.startsWith("video/")) return "🎬";
        if (mime.startsWith("audio/")) return "🎵";
        if (
        name.endsWith(".zip") ||
        name.endsWith(".rar") ||
        name.endsWith(".7z")
        ) return "🗜";
        if (
        name.endsWith(".doc") ||
        name.endsWith(".docx") ||
        name.endsWith(".txt")
        ) return "📝";

        return "📁";
    }

    await refreshFiles();

    /* =========================
       DRAG & DROP UPLOAD
    ========================= */

    const dropZone = document.querySelector(".cloud-upload-card");

    if (dropZone) {

        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.classList.add("drag-active");
        });

        dropZone.addEventListener("dragleave", () => {
            dropZone.classList.remove("drag-active");
        });

        dropZone.addEventListener("drop", async (e) => {

            e.preventDefault();
            dropZone.classList.remove("drag-active");

            const file = e.dataTransfer.files?.[0];
            if (!file) return;

            try {

                uploadBtn.disabled = true;
                uploadBtn.textContent = "Uploading...";

                const result = await uploadFile(file);
                console.log("Upload complete:", result);

                await refreshFiles();

            } catch (err) {

                console.error(err);
                alert(err.message);

            } finally {

                uploadBtn.disabled = false;
                uploadBtn.textContent = "Upload File";

            }

        });

    }
}