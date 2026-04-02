let lightboxInitialized = false;
let lightboxItems = [];
let lightboxIndex = 0;

function createLightboxMarkup() {
    return `
        <div id="lightbox-modal" class="lightbox-modal hidden">
            <div id="lightbox-backdrop" class="lightbox-backdrop"></div>

            <div class="lightbox-content">
                <button id="lightbox-close-btn" class="lightbox-close-btn" type="button" aria-label="Close">
                    ×
                </button>

                <button id="lightbox-prev-btn" class="lightbox-nav-btn lightbox-prev-btn" type="button" aria-label="Previous image">
                    ‹
                </button>

                <img id="lightbox-image" class="lightbox-image" alt="" />

                <button id="lightbox-next-btn" class="lightbox-nav-btn lightbox-next-btn" type="button" aria-label="Next image">
                    ›
                </button>
            </div>
        </div>
    `;
}

function renderLightboxImage() {
    const image = document.getElementById("lightbox-image");
    const prevBtn = document.getElementById("lightbox-prev-btn");
    const nextBtn = document.getElementById("lightbox-next-btn");

    if (!image) return;
    if (!lightboxItems.length) return;

    const currentItem = lightboxItems[lightboxIndex];
    image.src = currentItem.src;
    image.alt = currentItem.alt || "";

    const shouldShowNav = lightboxItems.length > 1;

    if (prevBtn) {
        prevBtn.classList.toggle("hidden", !shouldShowNav);
    }

    if (nextBtn) {
        nextBtn.classList.toggle("hidden", !shouldShowNav);
    }
}

function showPreviousLightboxImage() {
    if (lightboxItems.length <= 1) return;

    lightboxIndex = (lightboxIndex - 1 + lightboxItems.length) % lightboxItems.length;
    renderLightboxImage();
}

function showNextLightboxImage() {
    if (lightboxItems.length <= 1) return;

    lightboxIndex = (lightboxIndex + 1) % lightboxItems.length;
    renderLightboxImage();
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
    const prevBtn = document.getElementById("lightbox-prev-btn");
    const nextBtn = document.getElementById("lightbox-next-btn");

    if (backdrop) {
        backdrop.addEventListener("click", closeLightboxModal);
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", closeLightboxModal);
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", showPreviousLightboxImage);
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", showNextLightboxImage);
    }

    document.addEventListener("keydown", (e) => {
        const modalEl = document.getElementById("lightbox-modal");
        if (!modalEl || modalEl.classList.contains("hidden")) return;

        if (e.key === "Escape") {
            closeLightboxModal();
        }

        if (e.key === "ArrowLeft") {
            showPreviousLightboxImage();
        }

        if (e.key === "ArrowRight") {
            showNextLightboxImage();
        }
    });

    lightboxInitialized = true;
}

export function openLightboxModal(imageSrc, imageAlt = "") {
    openLightboxGallery(
        [{ src: imageSrc, alt: imageAlt }],
        0
    );
}

export function openLightboxGallery(items = [], startIndex = 0) {
    initLightboxModal();

    const modal = document.getElementById("lightbox-modal");
    if (!modal) return;
    if (!items.length) return;

    lightboxItems = items;
    lightboxIndex = Math.max(0, Math.min(startIndex, items.length - 1));

    renderLightboxImage();

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
    lightboxItems = [];
    lightboxIndex = 0;
    document.body.classList.remove("lightbox-open");
}