let lightboxInitialized = false;

function createLightboxMarkup() {
    return `
        <div id="lightbox-modal" class="lightbox-modal hidden">
            <div id="lightbox-backdrop" class="lightbox-backdrop"></div>

            <div class="lightbox-content">
                <button id="lightbox-close-btn" class="lightbox-close-btn" type="button" aria-label="Close">
                    ×
                </button>

                <img id="lightbox-image" class="lightbox-image" alt="" />
            </div>
        </div>
    `;
}

export function initLightboxModal() {
    if (lightboxInitialized) return;

    let modal = document.getElementById("lightbox-modal");

    if (!modal) {
        document.body.insertAdjacentHTML("beforeend", createLightboxMarkup());
        modal = document.getElementById("lightbox-modal");
    }

    const backdrop = document.getElementById("lightbox-backdrop");
    const closeBtn = document.getElementById("lightbox-close-btn");

    if (backdrop) {
        backdrop.addEventListener("click", closeLightboxModal);
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", closeLightboxModal);
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeLightboxModal();
        }
    });

    lightboxInitialized = true;
}

export function openLightboxModal(imageSrc, imageAlt = "") {
    initLightboxModal();

    const modal = document.getElementById("lightbox-modal");
    const image = document.getElementById("lightbox-image");

    if (!modal || !image) return;

    image.src = imageSrc;
    image.alt = imageAlt || "";
    modal.classList.remove("hidden");
    document.body.classList.add("lightbox-open");
}

export function closeLightboxModal() {
    const modal = document.getElementById("lightbox-modal");
    const image = document.getElementById("lightbox-image");

    if (!modal || !image) return;

    modal.classList.add("hidden");
    image.src = "";
    image.alt = "";
    document.body.classList.remove("lightbox-open");
}