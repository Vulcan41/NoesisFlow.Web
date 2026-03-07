import { supabase } from "../../core/supabase.js";
import { userStore } from "../../state/userStore.js";
import { loadView } from "../../core/router.js";

export function initProfileEdit() {

    loadProfile();
    setupCancel();
    setupSave();

}

/* =========================
   LOAD EXISTING DATA
========================= */

function loadProfile() {

    const profile = userStore.getProfile();
    if (!profile) return;

    const fullname = document.getElementById("edit-fullname");
    const username = document.getElementById("edit-username");
    const bio = document.getElementById("edit-bio");

    if (fullname) fullname.value = profile.full_name ?? "";
    if (username) username.value = profile.username ?? "";
    if (bio) bio.value = profile.bio ?? "";

}

/* =========================
   CANCEL EDIT
========================= */

function setupCancel() {

    const btn = document.getElementById("cancel-edit");

    btn?.addEventListener("click", () => {

        loadView("profile");

    });

}

/* =========================
   SAVE PROFILE
========================= */

function setupSave() {

    const btn = document.getElementById("save-edit");

    btn?.addEventListener("click", async () => {

        const user = userStore.getUser();
        if (!user) return;

        const full_name =
        document.getElementById("edit-fullname")?.value ?? "";

        const username =
        document.getElementById("edit-username")?.value ?? "";

        const bio =
        document.getElementById("edit-bio")?.value ?? "";

        const { error } = await supabase
            .from("profiles")
            .update({
            full_name,
            username,
            bio
        })
            .eq("id", user.id);

        if (error) {

            console.error("Profile update failed:", error);
            alert("Σφάλμα αποθήκευσης");

            return;

        }

        /* refresh local store */
        await userStore.refreshProfile();


        /* return to profile view */
        loadView("profile");

    });

}

