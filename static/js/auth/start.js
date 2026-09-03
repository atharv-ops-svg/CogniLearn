
/* ================================
   KNOWVIA — START JAVASCRIPT
   ================================ */

document.addEventListener("DOMContentLoaded", () => {

    const buttons = document.querySelectorAll(".start-button");

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            button.style.transform = "scale(0.97)";

            setTimeout(() => {
                button.style.transform = "";
            }, 100);

        });

    });

});
