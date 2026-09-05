
/* ============================================================
   KNOWVIA — LOGIN
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    const passwordInput =
        document.getElementById("password");

    const togglePassword =
        document.getElementById("toggle-password");

    const passwordIcon =
        document.getElementById("password-icon");


    if (!passwordInput ||
        !togglePassword ||
        !passwordIcon) {
        return;
    }


    togglePassword.addEventListener("click", () => {

        const passwordHidden =
            passwordInput.type === "password";


        if (passwordHidden) {

            passwordInput.type = "text";

            passwordIcon.src =
                "/static/images/hide-password.png";

            passwordIcon.alt =
                "Hide password";

            togglePassword.setAttribute(
                "aria-label",
                "Hide password"
            );

        } else {

            passwordInput.type = "password";

            passwordIcon.src =
                "/static/images/show-password.png";

            passwordIcon.alt =
                "Show password";

            togglePassword.setAttribute(
                "aria-label",
                "Show password"
            );

        }

    });

});