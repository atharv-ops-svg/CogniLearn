/* =========================================================
   KNOWVIA — KV AI
   Markdown-enabled version
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const form =
        document.getElementById("ai-form");

    const input =
        document.getElementById("ai-input");

    const messages =
        document.getElementById("ai-messages");

    const welcome =
        document.getElementById("ai-welcome");

    const sendButton =
        document.getElementById("ai-send-button");

    const characterCount =
        document.getElementById("ai-character-count");

    const suggestions =
        document.querySelectorAll(".ai-suggestion");


    /* =====================================================
       SAFETY CHECK
       ===================================================== */

    if (
        !form ||
        !input ||
        !messages ||
        !sendButton
    ) {
        console.error(
            "KV AI: Required elements were not found."
        );

        return;
    }


    /* =====================================================
       MARKDOWN CHECK
       ===================================================== */

    if (
        typeof marked === "undefined" ||
        typeof DOMPurify === "undefined"
    ) {
        console.error(
            "KV AI: Markdown libraries failed to load."
        );
    }


    /* =====================================================
       RESIZE INPUT
       ===================================================== */

    function resizeInput() {

        input.style.height = "auto";

        const height =
            Math.min(
                input.scrollHeight,
                160
            );

        input.style.height =
            `${height}px`;
    }


    /* =====================================================
       CHARACTER COUNT
       ===================================================== */

    function updateCharacterCount() {

        if (!characterCount) {
            return;
        }

        characterCount.textContent =
            `${input.value.length} / 4000`;
    }


    /* =====================================================
       SCROLL
       ===================================================== */

    function scrollToBottom(
        smooth = true
    ) {

        messages.scrollTo({
            top: messages.scrollHeight,
            behavior:
                smooth
                    ? "smooth"
                    : "auto"
        });
    }


    /* =====================================================
       REMOVE WELCOME
       ===================================================== */

    function removeWelcome() {

        if (welcome) {
            welcome.remove();
        }
    }


    /* =====================================================
       RENDER MARKDOWN
       ===================================================== */

    function renderMarkdown(text) {

        /*
         * If the Markdown libraries are unavailable,
         * safely fall back to plain text.
         */

        if (
            typeof marked === "undefined" ||
            typeof DOMPurify === "undefined"
        ) {
            return null;
        }

        try {

            const html =
                marked.parse(
                    String(text),
                    {
                        breaks: true,
                        gfm: true
                    }
                );

            return DOMPurify.sanitize(
                html,
                {
                    USE_PROFILES: {
                        html: true
                    }
                }
            );

        } catch (error) {

            console.error(
                "KV AI Markdown rendering error:",
                error
            );

            return null;
        }
    }


    /* =====================================================
       ADD MESSAGE
       ===================================================== */

    function addMessage(
        text,
        role = "user"
    ) {

        removeWelcome();

        const message =
            document.createElement("div");

        message.className =
            `ai-message ${role}`;


        const content =
            document.createElement("div");

        content.className =
            "ai-message-content";


        const textElement =
            document.createElement("div");

        textElement.className =
            "ai-message-text";


        /*
         * User messages stay plain text.
         *
         * Assistant messages support Markdown.
         */

        if (
            role === "assistant" &&
            typeof marked !== "undefined" &&
            typeof DOMPurify !== "undefined"
        ) {

            const rendered =
                renderMarkdown(text);

            if (rendered !== null) {

                textElement.innerHTML =
                    rendered;

            } else {

                textElement.textContent =
                    text;
            }

        } else {

            /*
             * textContent prevents user input
             * from being interpreted as HTML.
             */

            textElement.textContent =
                text;
        }


        const meta =
            document.createElement("div");

        meta.className =
            "ai-message-meta";

        meta.textContent =
            role === "user"
                ? "YOU"
                : "KV AI";


        content.appendChild(
            textElement
        );

        content.appendChild(
            meta
        );

        message.appendChild(
            content
        );

        messages.appendChild(
            message
        );

        scrollToBottom();

        return message;
    }


    /* =====================================================
       THINKING INDICATOR
       ===================================================== */

    function addThinking() {

        removeWelcome();

        const message =
            document.createElement("div");

        message.className =
            "ai-message assistant thinking-message";


        const content =
            document.createElement("div");

        content.className =
            "ai-message-content";


        const dots =
            document.createElement("div");

        dots.className =
            "thinking-dots";


        for (
            let i = 0;
            i < 3;
            i++
        ) {

            const dot =
                document.createElement("span");

            dots.appendChild(
                dot
            );
        }


        content.appendChild(
            dots
        );

        message.appendChild(
            content
        );

        messages.appendChild(
            message
        );

        scrollToBottom();

        return message;
    }


    /* =====================================================
       SEND TO KV AI
       ===================================================== */

    async function sendMessage(
        suppliedMessage = null
    ) {

        const message =
            suppliedMessage !== null
                ? suppliedMessage.trim()
                : input.value.trim();


        /*
         * Don't send empty messages.
         */

        if (!message) {
            return;
        }


        /*
         * Prevent duplicate requests.
         */

        if (sendButton.disabled) {
            return;
        }


        /*
         * Add user's message.
         */

        addMessage(
            message,
            "user"
        );


        /*
         * Clear input.
         */

        input.value = "";

        resizeInput();

        updateCharacterCount();


        /*
         * Lock input while waiting.
         */

        input.disabled = true;

        sendButton.disabled = true;


        /*
         * Show thinking indicator.
         */

        const thinking =
            addThinking();


        try {

            const response =
                await fetch(
                    "/api/ai",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                message: message
                            })
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `KV AI request failed: ${response.status}`
                );
            }


            const data =
                await response.json();


            /*
             * Remove thinking indicator.
             */

            if (thinking) {
                thinking.remove();
            }


            /*
             * Accept several response
             * formats from the backend.
             */

            const reply =
                data.reply ||
                data.response ||
                data.message;


            if (reply) {

                addMessage(
                    reply,
                    "assistant"
                );

            } else {

                addMessage(
                    "KV AI returned an empty response.",
                    "assistant"
                );
            }


        } catch (error) {

            console.error(
                "KV AI error:",
                error
            );


            if (thinking) {
                thinking.remove();
            }


            addMessage(
                "I couldn't connect to KV AI right now. Please try again.",
                "assistant"
            );


        } finally {

            input.disabled = false;

            sendButton.disabled = false;

            input.focus();

            scrollToBottom();
        }
    }


    /* =====================================================
       FORM
       ===================================================== */

    form.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();

            sendMessage();
        }
    );


    /* =====================================================
       ENTER / SHIFT + ENTER
       ===================================================== */

    input.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();
            }

            /*
             * Shift + Enter creates a newline.
             */
        }
    );


    /* =====================================================
       INPUT
       ===================================================== */

    input.addEventListener(
        "input",
        () => {

            resizeInput();

            updateCharacterCount();
        }
    );


    /* =====================================================
       SUGGESTION BUTTONS
       ===================================================== */

    suggestions.forEach(
        (suggestion) => {

            suggestion.addEventListener(
                "click",
                () => {

                    const message =
                        suggestion.dataset.message;

                    if (!message) {
                        return;
                    }

                    sendMessage(
                        message
                    );
                }
            );
        }
    );


    /* =====================================================
       INITIALIZE
       ===================================================== */

    resizeInput();

    updateCharacterCount();

    input.focus();

});