import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

/* =========================
   R2 CLIENT
========================= */

const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

/* =========================
   SUPABASE CLIENTS
========================= */

function getUserClient(req) {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
            global: {
                headers: {
                    Authorization: req.headers.authorization || ""
                }
            }
        }
    );
}

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================
   HELPERS
========================= */

async function collectFolderTree(folderId) {
    const folderIds = [];
    const queue = [folderId];

    while (queue.length) {
        const currentId = queue.shift();
        folderIds.push(currentId);

        const { data: children, error } = await supabaseAdmin
            .from("project_folders")
            .select("id")
            .eq("parent_folder_id", currentId);

        if (error) throw error;

        (children || []).forEach((child) => queue.push(child.id));
    }

    return folderIds;
}

/* =========================
   HANDLER
========================= */

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { folderId } = req.body || {};

        if (!folderId) {
            return res.status(400).json({ error: "Missing folderId" });
        }

        /* =========================
           STEP 1: Get current user
        ========================= */

        const supabaseUser = getUserClient(req);

        const {
            data: { user },
            error: userError
        } = await supabaseUser.auth.getUser();

        if (userError || !user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        /* =========================
           STEP 2: Load target folder
        ========================= */

        const { data: folder, error: folderError } = await supabaseAdmin
            .from("project_folders")
            .select("id, project_id, created_by, is_default")
            .eq("id", folderId)
            .single();

        if (folderError || !folder) {
            return res.status(404).json({ error: "Folder not found" });
        }

        if (folder.is_default) {
            return res.status(403).json({ error: "Default folder cannot be deleted" });
        }

        /* =========================
           STEP 3: Load project
        ========================= */

        const { data: project, error: projectError } = await supabaseAdmin
            .from("projects")
            .select("id, owner_id")
            .eq("id", folder.project_id)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const isOwner = project.owner_id === user.id;
        const isFolderCreator = folder.created_by === user.id;

        if (!isOwner && !isFolderCreator) {
            return res.status(403).json({ error: "Forbidden" });
        }

        /* =========================
           STEP 4: Collect folder tree
        ========================= */

        const folderIds = await collectFolderTree(folder.id);

        /* =========================
           STEP 5: If member, ensure whole tree belongs to them
        ========================= */

        if (!isOwner) {
            const { data: treeFolders, error: treeFoldersError } = await supabaseAdmin
                .from("project_folders")
                .select("id, created_by")
                .in("id", folderIds);

            if (treeFoldersError) throw treeFoldersError;

            const { data: treeFiles, error: treeFilesError } = await supabaseAdmin
                .from("project_files")
                .select("id, uploaded_by")
                .in("folder_id", folderIds);

            if (treeFilesError) throw treeFilesError;

            const hasForeignFolder = (treeFolders || []).some(
                (item) => item.created_by !== user.id
            );

            const hasForeignFile = (treeFiles || []).some(
                (item) => item.uploaded_by !== user.id
            );

            if (hasForeignFolder || hasForeignFile) {
                return res.status(403).json({
                    error: "You can only delete folder trees containing items you created"
                });
            }
        }

        /* =========================
           STEP 6: Load files to delete from storage
        ========================= */

        const { data: files, error: filesError } = await supabaseAdmin
            .from("project_files")
            .select("id, object_key")
            .in("folder_id", folderIds);

        if (filesError) throw filesError;

        /* =========================
           STEP 7: Delete storage objects
        ========================= */

        for (const file of files || []) {
            if (!file.object_key) continue;

            const command = new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: file.object_key,
            });

            await client.send(command);
        }

        /* =========================
           STEP 8: Delete files from DB
        ========================= */

        const { error: deleteFilesError } = await supabaseAdmin
            .from("project_files")
            .delete()
            .in("folder_id", folderIds);

        if (deleteFilesError) throw deleteFilesError;

        /* =========================
           STEP 9: Delete folders from DB
        ========================= */

        const { error: deleteFoldersError } = await supabaseAdmin
            .from("project_folders")
            .delete()
            .in("id", folderIds);

        if (deleteFoldersError) throw deleteFoldersError;

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("Delete folder error:", error);
        return res.status(500).json({ error: "Failed to delete folder" });
    }
}