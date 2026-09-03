
// ============================================================
// KNOWVIA CHAT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    const form =
        document.getElementById("chat-form");

    const input =
        document.getElementById("message-input");

    const messages =
        document.getElementById("messages");


    // --------------------------------------------------------
    // Add message
    // --------------------------------------------------------

    function addMessage(
        text,
        type
    ) {

        const message =
            document.createElement("div");

        message.className =
            `message ${type}`;

        message.textContent = text;

        messages.appendChild(message);

        messages.scrollTop =
            messages.scrollHeight;
    }


    // --------------------------------------------------------
    // Submit
    // --------------------------------------------------------

    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            const text =
                input.value.trim();

            if (!text) {
                return;
            }

            addMessage(
                text,
                "user"
            );

            input.value = "";

            /*
             * This is currently the frontend
             * chat layer.
             *
             * Real-time two-person messaging
             * can be connected here using
             * Flask-SocketIO.
             */

        }
    );


    console.log(
        "KnowVia chat loaded."
    );

});