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

    const wrapper = document.querySelector(".user-wrapper");
    const dropdown = document.getElementById("user-dropdown");

    const dropdownProfile = document.getElementById("dropdown-profile");
    const dropdownLogout = document.getElementById("dropdown-logout");

    if (!wrapper || !dropdown) return;

    let hideTimer;

    /* show dropdown */

    wrapper.addEventListener("mouseenter", () => {

        clearTimeout(hideTimer);
        dropdown.classList.remove("dropdown-hidden");

    });

    /* hide dropdown with delay */

    wrapper.addEventListener("mouseleave", () => {

        hideTimer = setTimeout(() => {
            dropdown.classList.add("dropdown-hidden");
        }, 120);

    });

    /* profile */

    dropdownProfile?.addEventListener("click", () => {

        dropdown.classList.add("dropdown-hidden");
        loadView("profile");

    });

    /* logout */

    dropdownLogout?.addEventListener("click", (e) => {

        e.stopPropagation();
        dropdown.classList.add("dropdown-hidden");

        const modal = document.getElementById("logout-modal");
        modal?.classList.remove("modal-hidden");

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