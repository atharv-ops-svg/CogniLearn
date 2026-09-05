document.addEventListener("DOMContentLoaded", () => {

    const toggleButtons = document.querySelectorAll(".password-toggle");

    toggleButtons.forEach((button) => {

        button.addEventListener("click", () => {

            const targetId = button.dataset.target;
            const input = document.getElementById(targetId);

            if (!input) {
                return;
            }

            if (input.type === "password") {

                input.type = "text";

                button.textContent = "HIDE";
                button.setAttribute(
                    "aria-label",
                    "Hide password"
                );

            } else {

                input.type = "password";

                button.textContent = "SHOW";
                button.setAttribute(
                    "aria-label",
                    "Show password"
                );

            }

        });

    });

});