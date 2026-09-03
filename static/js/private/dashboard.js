/* =========================================================
   KNOWVIA — DASHBOARD V2
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /*
     * Small entrance animation.
     * Everything starts slightly lower and fades into place.
     */

    const sections = document.querySelectorAll(
        ".welcome-section, .skills-section, .command-section"
    );

    sections.forEach((section, index) => {

        section.style.opacity = "0";
        section.style.transform = "translateY(12px)";

        setTimeout(() => {

            section.style.transition =
                "opacity 0.5s ease, transform 0.5s ease";

            section.style.opacity = "1";
            section.style.transform = "translateY(0)";

        }, 80 + index * 100);

    });


    /*
     * Add a subtle interaction to command cards.
     */

    const commandCards = document.querySelectorAll(".command-card");

    commandCards.forEach((card) => {

        card.addEventListener("mouseenter", () => {
            card.style.transform = "translateY(-2px)";
        });

        card.addEventListener("mouseleave", () => {
            card.style.transform = "translateY(0)";
        });

    });

});