// ============================================================
// KNOWVIA CHAT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("chat-form");
    const input = document.getElementById("message-input");
    const messages = document.getElementById("chat-messages");
    const emptyState = document.getElementById("chat-empty");
    const characterCount = document.getElementById("character-count");
    const sendButton = document.getElementById("send-button");

    const matchesList = document.getElementById("matches-list");
    const matchesLoading = document.getElementById("matches-loading");
    const matchesEmpty = document.getElementById("matches-empty");
    const matchesError = document.getElementById("matches-error");
    const retryMatches = document.getElementById("retry-matches");

    const partnerAvatar = document.getElementById("partner-avatar");
    const partnerName = document.getElementById("partner-name");
    const partnerStatus = document.getElementById("partner-status");

    let selectedPartner = null;

    // --------------------------------------------------------
    // Match state
    // --------------------------------------------------------

    function setMatchesState(state) {
        matchesLoading.hidden = state !== "loading";
        matchesEmpty.hidden = state !== "empty";
        matchesError.hidden = state !== "error";
        matchesList.hidden = state !== "success";
    }

    // --------------------------------------------------------
    // Add message
    // --------------------------------------------------------

    function addMessage(text, type) {
        if (emptyState) {
            emptyState.remove();
        }

        const message = document.createElement("div");

        message.className = `message ${type}`;

        message.textContent = String(text);

        messages.appendChild(message);

        messages.scrollTop = messages.scrollHeight;
    }

    // --------------------------------------------------------
    // Select partner
    // --------------------------------------------------------

    function selectPartner(match, card) {
        selectedPartner = match;

        document
            .querySelectorAll(".match-card")
            .forEach((item) => {
                item.classList.remove("selected");
            });

        card.classList.add("selected");

        const name =
            match.name ||
            match.username ||
            "Skill Partner";

        partnerName.textContent = name;

        partnerStatus.textContent =
            "Selected skill partner";

        const firstLetter =
            name.trim().charAt(0).toUpperCase();

        partnerAvatar.textContent =
            firstLetter || "?";

        input.disabled = false;
        sendButton.disabled = false;

        input.placeholder =
            `Message ${name}...`;

        input.focus();

        if (emptyState) {
            const heading =
                emptyState.querySelector("h2");

            const paragraph =
                emptyState.querySelector("p");

            if (heading) {
                heading.textContent =
                    `Ready to learn with ${name}`;
            }

            if (paragraph) {
                paragraph.textContent =
                    "Your skill exchange conversation will appear here.";
            }
        }
    }

    // --------------------------------------------------------
    // Create skill tag
    // --------------------------------------------------------

    function createSkillTag(
        skill,
        className = ""
    ) {
        const tag =
            document.createElement("span");

        tag.className =
            `skill-tag ${className}`.trim();

        tag.textContent =
            String(skill);

        return tag;
    }

    // --------------------------------------------------------
    // Create match card
    // --------------------------------------------------------

    function createMatchCard(match) {
        const card =
            document.createElement("article");

        card.className =
            "match-card";

        const name =
            match.name ||
            match.username ||
            "KnowVia User";

        const username =
            match.username
                ? `@${match.username}`
                : "";

        // ----------------------------------------------------
        // Header
        // ----------------------------------------------------

        const header =
            document.createElement("div");

        header.className =
            "match-card-header";

        const avatar =
            document.createElement("div");

        avatar.className =
            "match-avatar";

        avatar.textContent =
            name.trim().charAt(0).toUpperCase() || "?";

        const identity =
            document.createElement("div");

        identity.className =
            "match-identity";

        const nameElement =
            document.createElement("strong");

        nameElement.textContent =
            name;

        const usernameElement =
            document.createElement("span");

        usernameElement.textContent =
            username;

        identity.appendChild(
            nameElement
        );

        identity.appendChild(
            usernameElement
        );

        const matchType =
            document.createElement("span");

        matchType.className =
            "match-type";

        if (match.match_type === "perfect") {
            matchType.classList.add("perfect");
            matchType.textContent =
                "TWO-WAY MATCH";
        } else {
            matchType.textContent =
                "LEARNING MATCH";
        }

        header.appendChild(avatar);
        header.appendChild(identity);
        header.appendChild(matchType);

        card.appendChild(header);

        // ----------------------------------------------------
        // Can teach
        // ----------------------------------------------------

        if (
            Array.isArray(match.can_teach) &&
            match.can_teach.length > 0
        ) {
            const section =
                document.createElement("div");

            section.className =
                "match-skills";

            const label =
                document.createElement("span");

            label.className =
                "match-skill-label";

            label.textContent =
                "CAN TEACH YOU";

            const tags =
                document.createElement("div");

            tags.className =
                "skill-tags";

            match.can_teach.forEach(
                (skill) => {
                    tags.appendChild(
                        createSkillTag(
                            skill,
                            "teach"
                        )
                    );
                }
            );

            section.appendChild(label);
            section.appendChild(tags);

            card.appendChild(section);
        }

        // ----------------------------------------------------
        // Can learn
        // ----------------------------------------------------

        if (
            Array.isArray(match.can_learn) &&
            match.can_learn.length > 0
        ) {
            const section =
                document.createElement("div");

            section.className =
                "match-skills";

            const label =
                document.createElement("span");

            label.className =
                "match-skill-label";

            label.textContent =
                "WANTS TO LEARN FROM YOU";

            const tags =
                document.createElement("div");

            tags.className =
                "skill-tags";

            match.can_learn.forEach(
                (skill) => {
                    tags.appendChild(
                        createSkillTag(
                            skill,
                            "learn"
                        )
                    );
                }
            );

            section.appendChild(label);
            section.appendChild(tags);

            card.appendChild(section);
        }

        // ----------------------------------------------------
        // Bridge Up
        // ----------------------------------------------------

        const bridgeButton =
            document.createElement("button");

        bridgeButton.type =
            "button";

        bridgeButton.className =
            "bridge-button";

        bridgeButton.textContent =
            "Bridge Up ↗";

        bridgeButton.addEventListener(
            "click",
            () => {
                selectPartner(
                    match,
                    card
                );
            }
        );

        card.appendChild(
            bridgeButton
        );

        return card;
    }

    // --------------------------------------------------------
    // Load matches
    // --------------------------------------------------------

    async function loadMatches() {
        setMatchesState("loading");

        matchesList.innerHTML = "";

        matchesList.appendChild(
            matchesLoading
        );

        try {
            const response =
                await fetch(
                    "/api/matches",
                    {
                        method: "GET",
                        headers: {
                            Accept:
                                "application/json"
                        },
                        credentials:
                            "same-origin"
                    }
                );

            const data =
                await response
                    .json()
                    .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Failed to load matches."
                );
            }

            const matches =
                Array.isArray(data.matches)
                    ? data.matches
                    : [];

            if (matches.length === 0) {
                setMatchesState("empty");
                return;
            }

            matchesList.innerHTML = "";

            matches.forEach(
                (match) => {
                    matchesList.appendChild(
                        createMatchCard(
                            match
                        )
                    );
                }
            );

            setMatchesState(
                "success"
            );
        } catch (error) {
            console.error(
                "KnowVia match loading error:",
                error
            );

            setMatchesState(
                "error"
            );
        }
    }

    // --------------------------------------------------------
    // Character counter
    // --------------------------------------------------------

    function updateCharacterCount() {
        characterCount.textContent =
            `${input.value.length} / 2000`;
    }

    // --------------------------------------------------------
    // Auto resize textarea
    // --------------------------------------------------------

    function resizeInput() {
        input.style.height =
            "auto";

        input.style.height =
            `${Math.min(
                input.scrollHeight,
                180
            )}px`;
    }

    // --------------------------------------------------------
    // Send message
    // --------------------------------------------------------

    form.addEventListener(
        "submit",
        (event) => {
            event.preventDefault();

            const text =
                input.value.trim();

            if (!text) {
                return;
            }

            if (!selectedPartner) {
                addMessage(
                    "Select a skill partner with “Bridge Up” before sending a message.",
                    "system"
                );

                return;
            }

            addMessage(
                text,
                "user"
            );

            input.value = "";

            updateCharacterCount();

            resizeInput();

            /*
             * Real two-person messaging is
             * not connected yet.
             *
             * This frontend currently handles
             * partner selection and the local
             * chat interface.
             */
        }
    );

    // --------------------------------------------------------
    // Enter to send
    // --------------------------------------------------------

    input.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {
                event.preventDefault();

                form.requestSubmit();
            }
        }
    );

    // --------------------------------------------------------
    // Input events
    // --------------------------------------------------------

    input.addEventListener(
        "input",
        () => {
            updateCharacterCount();
            resizeInput();
        }
    );

    // --------------------------------------------------------
    // Retry matches
    // --------------------------------------------------------

    retryMatches.addEventListener(
        "click",
        loadMatches
    );

    // --------------------------------------------------------
    // Initial state
    // --------------------------------------------------------

    input.disabled = true;

    sendButton.disabled = true;

    updateCharacterCount();

    resizeInput();

    loadMatches();

    console.log(
        "KnowVia chat loaded."
    );
});