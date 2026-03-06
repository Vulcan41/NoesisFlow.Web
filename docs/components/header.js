import { supabase } from "../core/supabase.js";
import { loadView } from "../core/router.js";
import { userStore } from "../state/userStore.js";


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    const homeBtn = document.getElementById("home-btn");
    const friendsBtn = document.getElementById("friends-btn");
    const messagesBtn = document.getElementById("messages-btn");
    const notificationsBtn = document.getElementById("notifications-btn");
    const settingsBtn = document.getElementById("settings-btn");
    const debugBtn = document.getElementById("debug-btn");

    homeBtn?.addEventListener("click", () => loadView("basic"));
    friendsBtn?.addEventListener("click", () => loadView("friends"));
    messagesBtn?.addEventListener("click", () => loadView("messages"));
    notificationsBtn?.addEventListener("click", () => loadView("notifications"));
    settingsBtn?.addEventListener("click", () => loadView("settings"));
    debugBtn?.addEventListener("click", () => loadView("debug"));

}

export function initHeader() {

    loadHeaderUser();
    loadCredits();
    setupNavigation();   // ← add this
    setupDropdown();
    setupLogoutModal();

}


/* =========================================================
   LOAD HEADER USERNAME
========================================================= */

function loadHeaderUser() {

    const profile = userStore.getProfile();

    if (!profile) return;

    document.getElementById("user-name").textContent =
    profile.username || "Username";

}

/* =========================================================
   LOAD CREDITS
========================================================= */

function loadCredits() {

    const profile = userStore.getProfile();
    if (!profile) return;

    const creditsEl = document.getElementById("credits-value");

    if (creditsEl) {
        creditsEl.textContent = profile.credits ?? 0;
    }

}

/* =========================================================
   USER DROPDOWN
========================================================= */

function setupDropdown() {

    const userBtn = document.getElementById("user-btn");
    const userDropdown = document.getElementById("user-dropdown");
    const dropdownProfile = document.getElementById("dropdown-profile");
    const dropdownLogout = document.getElementById("dropdown-logout");

    userBtn?.addEventListener("click", (e) => {

        e.stopPropagation();
        userDropdown.classList.toggle("dropdown-hidden");

    });

    userDropdown?.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    dropdownProfile?.addEventListener("click", () => {

        userDropdown.classList.add("dropdown-hidden");
        loadView("profile");

    });

    dropdownLogout?.addEventListener("click", (e) => {

        e.stopPropagation();
        userDropdown.classList.add("dropdown-hidden");

        const modal = document.getElementById("logout-modal");
        modal?.classList.remove("modal-hidden");

    });

    document.addEventListener("click", () => {

        userDropdown?.classList.add("dropdown-hidden");

    });

}

/* =========================================================
   LOGOUT MODAL
========================================================= */

function setupLogoutModal() {

    const modal = document.getElementById("logout-modal");
    const cancelBtn = document.getElementById("cancel-logout");
    const confirmBtn = document.getElementById("confirm-logout");

    cancelBtn?.addEventListener("click", () => {

        modal?.classList.add("modal-hidden");

    });

    confirmBtn?.addEventListener("click", async () => {

        await supabase.auth.signOut();
        window.location.href = "index.html";

    });

}