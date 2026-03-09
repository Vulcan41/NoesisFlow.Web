// index.js
import { supabase } from "./core/supabase.js";

/* =========================================================
   LOAD REGISTER MODAL
========================================================= */

async function loadRegisterModal() {

    const res = await fetch("register/register.html");
    const html = await res.text();

    document.body.insertAdjacentHTML("beforeend", html);

}

await loadRegisterModal();

/* =========================================================
   AVATAR PREVIEW
========================================================= */

const avatarInput = document.getElementById("register-avatar-input");
const avatarPreview = document.getElementById("register-avatar-preview");

avatarInput?.addEventListener("change", () => {

    const file = avatarInput.files[0];
    if (!file) return;

    avatarPreview.src = URL.createObjectURL(file);

});

/* =========================================================
   INPUT REFERENCES
========================================================= */

const email = document.getElementById("email");
const password = document.getElementById("password");

const registerEmail = document.getElementById("register-email");
const registerPassword = document.getElementById("register-password");
const registerOverlay = document.getElementById("register-overlay");

const registerUsername = document.getElementById("register-username");
const registerFullname = document.getElementById("register-fullname");
const registerBio = document.getElementById("register-bio");

/* =========================================================
   USERNAME CHECK
========================================================= */

async function usernameExists(username) {

    const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

    return !!data;

}

/* =========================================================
   SIGN UP
========================================================= */

async function signUp(e) {

    e?.preventDefault();

    const emailValue = registerEmail.value.trim();
    const passwordValue = registerPassword.value.trim();
    const username = registerUsername.value.trim();
    const fullname = registerFullname.value.trim();
    const bio = registerBio.value.trim();

    if (!emailValue || !passwordValue) {
        alert("Email and password required");
        return;
    }

    if (!username) {
        alert("Username required");
        return;
    }

    if (await usernameExists(username)) {
        alert("Username already exists");
        return;
    }

    /* ------------------------------
       CREATE AUTH USER
    ------------------------------ */

    const { data: signupData, error: signupError } =
    await supabase.auth.signUp({
        email: emailValue,
        password: passwordValue
    });

    if (signupError) {
        alert(signupError.message);
        return;
    }

    const user = signupData.user;

    if (!user) {
        alert("User creation failed");
        return;
    }

    /* ------------------------------
       AVATAR UPLOAD
    ------------------------------ */

    let avatarUrl = "/assets/user_icon_2.jpg";

    const file = avatarInput?.files?.[0];

    if (file) {

        const filePath = `${user.id}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase
            .storage
            .from("avatars")
            .upload(filePath, file);

        if (!uploadError) {

            const { data } = supabase
                .storage
                .from("avatars")
                .getPublicUrl(filePath);

            avatarUrl = data.publicUrl;

        }

    }

    /* ------------------------------
       CREATE PROFILE ROW
    ------------------------------ */

    const { error: profileError } = await supabase
        .from("profiles")
        .insert({
        id: user.id,
        username: username,
        full_name: fullname,
        bio: bio,
        avatar_url: avatarUrl
    });

    if (profileError) {

        console.error("PROFILE ERROR:", profileError);
        alert(profileError.message);

        return;

    }

    /* ------------------------------
       SUCCESS
    ------------------------------ */

    window.location.href = "home.html";

}

/* =========================================================
   LOGIN
========================================================= */

async function login(e) {

    e?.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
    });

    if (error) {
        alert(error.message);
        return;
    }

    window.location.href = "home.html";

}

/* =========================================================
   AUTO LOGIN CHECK
========================================================= */

const { data: { session } } = await supabase.auth.getSession();

if (session) {
    window.location.href = "home.html";
}

/* =========================================================
   BUTTON EVENTS
========================================================= */

document.getElementById("login-btn")?.addEventListener("click", login);

/* OPEN REGISTER MODAL */

document.getElementById("signup-btn")?.addEventListener("click", () => {
    registerOverlay.style.display = "flex";
});

/* REGISTER SUBMIT */

document.getElementById("register-submit")?.addEventListener("click", signUp);

/* REGISTER CANCEL */

document.getElementById("register-cancel")?.addEventListener("click", () => {
    registerOverlay.style.display = "none";
});
