import { supabase } from "../../core/supabase.js";
import { userStore } from "../../state/userStore.js";
import { loadView } from "../../core/router.js";

export function initProfile() {

    loadProfile();
    setupEditButton();

}

/* =========================
   LOAD PROFILE DATA
========================= */

function loadProfile() {

    const profile = userStore.getProfile();
    if (!profile) return;

    const avatar = document.getElementById("profile-avatar");

    avatar.src =
    profile.avatar_url && profile.avatar_url.trim() !== ""
    ? profile.avatar_url
    : "./assets/user_icon_2.jpg";

    avatar.onerror = () => {
        avatar.src = "./assets/user_icon_2.jpg";
    };

    document.getElementById("profile-fullname").textContent =
    profile.full_name ?? "";

    document.getElementById("profile-username").textContent =
    "@" + (profile.username ?? "");

    document.getElementById("profile-bio").textContent =
    profile.bio ?? "";

}

/* =========================
   EDIT PROFILE
========================= */

function setupEditButton() {

    const btn = document.getElementById("profile-edit-btn");

    btn?.addEventListener("click", () => {

        loadView("profileEdit");

    });

}