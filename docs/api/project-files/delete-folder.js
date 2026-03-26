import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const token = req.headers.authorization?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({ error: "Missing auth token" });
        }

        // get user from token
        const {
            data: { user },
            error: userError
        } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { folderId } = req.body;

        if (!folderId) {
            return res.status(400).json({ error: "Missing folderId" });
        }

        /* =========================
           LOAD ROOT FOLDER
        ========================= */

        const { data: rootFolder, error: rootError } = await supabase
            .from("project_folders")
            .select("id, project_id, is_default")
            .eq("id", folderId)
            .single();

        if (rootError || !rootFolder) {
            return res.status(404).json({ error: "Folder not found" });
        }

        if (rootFolder.is_default) {
            return res.status(400).json({ error: "Cannot delete default folder" });
        }

        /* =========================
           CHECK OWNER
        ========================= */

        const { data: project, error: projectError } = await supabase
            .from("projects")
            .select("owner_id")
            .eq("id", rootFolder.project_id)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ error: "Project not found" });
        }

        if (project.owner_id !== user.id) {
            return res.status(403).json({ error: "Not allowed" });
        }

        /* =========================
           LOAD ALL FOLDERS IN PROJECT
        ========================= */

        const { data: allFolders, error: foldersError } = await supabase
            .from("project_folders")
            .select("id, parent_folder_id")
            .eq("project_id", rootFolder.project_id);

        if (foldersError) {
            throw foldersError;
        }

        /* =========================
           BUILD TREE (RECURSIVE)
        ========================= */

        const folderIdsToDelete = new Set();
        const stack = [folderId];

        while (stack.length) {
            const currentId = stack.pop();
            folderIdsToDelete.add(currentId);

            const children = allFolders.filter(
                f => f.parent_folder_id === currentId
            );

            children.forEach(child => stack.push(child.id));
        }

        const folderIdsArray = [...folderIdsToDelete];

        /* =========================
           GET FILES IN THESE FOLDERS
        ========================= */

        const { data: files, error: filesError } = await supabase
            .from("project_files")
            .select("id, object_key")
            .in("folder_id", folderIdsArray);

        if (filesError) {
            throw filesError;
        }

        /* =========================
           DELETE FROM R2
        ========================= */

        for (const file of files) {
            try {
                const command = new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: file.object_key,
                });

                await s3.send(command);
            } catch (err) {
                console.error("R2 delete failed for:", file.object_key, err);
            }
        }

        /* =========================
           DELETE FILE ROWS
        ========================= */

        const { error: deleteFilesError } = await supabase
            .from("project_files")
            .delete()
            .in("folder_id", folderIdsArray);

        if (deleteFilesError) {
            throw deleteFilesError;
        }

        /* =========================
           DELETE FOLDERS
        ========================= */

        const { error: deleteFoldersError } = await supabase
            .from("project_folders")
            .delete()
            .in("id", folderIdsArray);

        if (deleteFoldersError) {
            throw deleteFoldersError;
        }

        return res.status(200).json({ success: true });

    } catch (err) {
        console.error("Delete folder error:", err);

        return res.status(500).json({
            error: "Failed to delete folder"
        });
    }
}