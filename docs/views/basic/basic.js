import { userStore } from "../../state/userStore.js";

export function initBasic() {

    const profile = userStore.getProfile();
    const user = userStore.getUser();

    if (!profile || !user) return;

    document.getElementById("debug-id").textContent = user.id;
    document.getElementById("debug-email").textContent = user.email;

    document.getElementById("debug-username").textContent =
    profile.username ?? "";

    document.getElementById("debug-fullname").textContent =
    profile.full_name ?? "";

    document.getElementById("debug-credits").textContent =
    profile.credits ?? 0;

}