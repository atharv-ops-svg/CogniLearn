/* =========================================================
   KNOWVIA — PUBLIC HOME
   Phase 10
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* -----------------------------------------------------
       Entrance animation
       ----------------------------------------------------- */

    const animatedElements = [
        document.querySelector(".hero-system"),
        document.querySelector(".hero h1"),
        document.querySelector(".hero-description"),
        document.querySelector(".hero-actions"),
    ];

    animatedElements.forEach((element, index) => {

        if (!element) {
            return;
        }

        element.style.opacity = "0";
        element.style.transform = "translateY(14px)";

        element.style.transition =
            `opacity 0.6s ease ${index * 0.1}s,
             transform 0.6s ease ${index * 0.1}s`;

        requestAnimationFrame(() => {
            element.style.opacity = "1";
            element.style.transform = "translateY(0)";
        });
    });


    /* -----------------------------------------------------
       Exchange card interaction
       ----------------------------------------------------- */

    const cards = document.querySelectorAll(".exchange-card");

    cards.forEach((card) => {

        card.addEventListener("mouseenter", () => {
            card.style.transform = "translateY(-4px)";
        });

        card.addEventListener("mouseleave", () => {
            card.style.transform = "translateY(0)";
        });

    });


    /* -----------------------------------------------------
       Prevent accidental double-click navigation
       ----------------------------------------------------- */

    const buttons = document.querySelectorAll(
        ".bridge-button, .hero-button, .cta-button"
    );

    buttons.forEach((button) => {

        button.addEventListener("click", () => {
            button.style.opacity = "0.75";

            setTimeout(() => {
                button.style.opacity = "1";
            }, 250);
        });

    });

});