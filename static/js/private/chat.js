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

    let currentUserId = null;
    let selectedPartner = null;
    let pollingTimer = null;
    let loadingMessages = false;

    // --------------------------------------------------------
    // MATCH STATE
    // --------------------------------------------------------

    function setMatchesState(state) {
        matchesLoading.hidden = state !== "loading";
        matchesEmpty.hidden = state !== "empty";
        matchesError.hidden = state !== "error";
        matchesList.hidden = state !== "success";
    }

    // --------------------------------------------------------
    // ADD MESSAGE
    // --------------------------------------------------------

    function addMessage(text, type) {
        if (emptyState) {
            emptyState.remove();
        }

        const message = document.createElement("div");
        message.className = `message ${type}`;
        message.textContent = String(text ?? "");

        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
    }

    // --------------------------------------------------------
    // RENDER CONVERSATION
    // --------------------------------------------------------

    function renderMessages(messageList) {
        messages.innerHTML = "";

        if (!messageList.length) {
            const empty = document.createElement("div");
            empty.className = "chat-empty";
            empty.id = "chat-empty";

            const symbol = document.createElement("div");
            symbol.className = "empty-symbol";
            symbol.textContent = "⇄";

            const heading = document.createElement("h2");
            heading.textContent = selectedPartner
                ? `Start learning with ${
                      selectedPartner.name ||
                      selectedPartner.username ||
                      "your partner"
                  }`
                : "Ready to connect";

            const paragraph = document.createElement("p");
            paragraph.textContent =
                "Your skill exchange conversation will appear here.";

            empty.appendChild(symbol);
            empty.appendChild(heading);
            empty.appendChild(paragraph);

            messages.appendChild(empty);
            return;
        }

        messageList.forEach((item) => {
            const type =
                Number(item.sender_id) === Number(currentUserId)
                    ? "user"
                    : "partner";

            addMessage(item.message, type);
        });
    }

    // --------------------------------------------------------
    // LOAD CONVERSATION
    // --------------------------------------------------------

    async function loadConversation() {
        if (
            !selectedPartner ||
            !currentUserId ||
            loadingMessages
        ) {
            return;
        }

        loadingMessages = true;

        try {
            const response = await fetch(
                `/api/chat/${encodeURIComponent(
                    selectedPartner.id
                )}`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json"
                    },
                    credentials: "same-origin",
                    cache: "no-store"
                }
            );

            const data =
                await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Failed to load messages."
                );
            }

            renderMessages(
                Array.isArray(data.messages)
                    ? data.messages
                    : []
            );
        } catch (error) {
            console.error(
                "KnowVia chat loading error:",
                error
            );
        } finally {
            loadingMessages = false;
        }
    }

    // --------------------------------------------------------
    // POLLING
    // --------------------------------------------------------

    function startPolling() {
        if (pollingTimer) {
            clearInterval(pollingTimer);
        }

        pollingTimer = setInterval(() => {
            loadConversation();
        }, 2000);
    }

    // --------------------------------------------------------
    // SELECT PARTNER
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
            "Connected skill partner";

        partnerAvatar.textContent =
            name.trim().charAt(0).toUpperCase() || "?";

        input.disabled = false;
        sendButton.disabled = false;

        input.placeholder =
            `Message ${name}...`;

        loadConversation();
        startPolling();

        input.focus();
    }

    // --------------------------------------------------------
    // SKILL TAG
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
            String(skill ?? "");

        return tag;
    }

    // --------------------------------------------------------
    // MATCH CARD
    // --------------------------------------------------------

    function createMatchCard(match) {
        const card =
            document.createElement("article");

        card.className = "match-card";

        const name =
            match.name ||
            match.username ||
            "KnowVia User";

        const username =
            match.username
                ? `@${match.username}`
                : "";

        // Header
        const header =
            document.createElement("div");

        header.className =
            "match-card-header";

        // Avatar
        const avatar =
            document.createElement("div");

        avatar.className =
            "match-avatar";

        avatar.textContent =
            name.trim().charAt(0).toUpperCase() ||
            "?";

        // Identity
        const identity =
            document.createElement("div");

        identity.className =
            "match-identity";

        const nameElement =
            document.createElement("strong");

        nameElement.textContent = name;

        const usernameElement =
            document.createElement("span");

        usernameElement.textContent =
            username;

        identity.append(
            nameElement,
            usernameElement
        );

        // Match type
        const type =
            document.createElement("span");

        type.className =
            `match-type ${
                match.match_type || "learning"
            }`;

        type.textContent =
            match.match_type === "perfect"
                ? "TWO-WAY MATCH"
                : "LEARNING MATCH";

        header.append(
            avatar,
            identity,
            type
        );

        card.appendChild(header);

        // Can teach
        if (
            Array.isArray(match.can_teach) &&
            match.can_teach.length
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

            section.append(label, tags);

            card.appendChild(section);
        }

        // Can learn
        if (
            Array.isArray(match.can_learn) &&
            match.can_learn.length
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

            section.append(label, tags);

            card.appendChild(section);
        }

        // Bridge Up
        const bridgeButton =
            document.createElement("button");

        bridgeButton.type = "button";

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

        card.appendChild(bridgeButton);

        return card;
    }

    // --------------------------------------------------------
    // LOAD MATCHES
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
                            "same-origin",
                        cache: "no-store"
                    }
                );

            const data =
                await response.json()
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

            if (!matches.length) {
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

            setMatchesState("success");
        } catch (error) {
            console.error(
                "KnowVia match loading error:",
                error
            );

            setMatchesState("error");
        }
    }

    // --------------------------------------------------------
    // CURRENT USER
    // --------------------------------------------------------

    async function loadCurrentUser() {
        const response =
            await fetch(
                "/api/me",
                {
                    method: "GET",
                    headers: {
                        Accept:
                            "application/json"
                    },
                    credentials:
                        "same-origin",
                    cache: "no-store"
                }
            );

        const data =
            await response.json()
                .catch(() => ({}));

        if (
            !response.ok ||
            !data.id
        ) {
            throw new Error(
                data.error ||
                "Unable to identify the current user."
            );
        }

        currentUserId =
            Number(data.id);
    }

    // --------------------------------------------------------
    // SEND MESSAGE
    // --------------------------------------------------------

    async function sendMessage() {
        const text =
            input.value.trim();

        if (
            !text ||
            !selectedPartner
        ) {
            return;
        }

        input.disabled = true;
        sendButton.disabled = true;

        try {
            const response =
                await fetch(
                    "/api/chat",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                            Accept:
                                "application/json"
                        },
                        credentials:
                            "same-origin",
                        body: JSON.stringify({
                            receiver_id:
                                selectedPartner.id,
                            message: text
                        })
                    }
                );

            const data =
                await response.json()
                    .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Message could not be sent."
                );
            }

            input.value = "";

            updateCharacterCount();
            resizeInput();

            await loadConversation();
        } catch (error) {
            console.error(
                "KnowVia send message error:",
                error
            );

            addMessage(
                `Message failed: ${error.message}`,
                "system"
            );
        } finally {
            input.disabled = false;
            sendButton.disabled = false;
            input.focus();
        }
    }

    // --------------------------------------------------------
    // CHARACTER COUNT
    // --------------------------------------------------------

    function updateCharacterCount() {
        characterCount.textContent =
            `${input.value.length} / 2000`;
    }

    // --------------------------------------------------------
    // TEXTAREA RESIZE
    // --------------------------------------------------------

    function resizeInput() {
        input.style.height = "auto";

        input.style.height =
            `${Math.min(
                input.scrollHeight,
                180
            )}px`;
    }

    // --------------------------------------------------------
    // FORM SUBMIT
    // --------------------------------------------------------

    form.addEventListener(
        "submit",
        (event) => {
            event.preventDefault();
            sendMessage();
        }
    );

    // --------------------------------------------------------
    // ENTER TO SEND
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
    // INPUT
    // --------------------------------------------------------

    input.addEventListener(
        "input",
        () => {
            updateCharacterCount();
            resizeInput();
        }
    );

    // --------------------------------------------------------
    // RETRY
    // --------------------------------------------------------

    retryMatches.addEventListener(
        "click",
        loadMatches
    );

    // --------------------------------------------------------
    // INITIAL STATE
    // --------------------------------------------------------

    input.disabled = true;
    sendButton.disabled = true;

    updateCharacterCount();
    resizeInput();

    // --------------------------------------------------------
    // START CHAT
    // --------------------------------------------------------

    (async () => {
        try {
            await loadCurrentUser();
            await loadMatches();
        } catch (error) {
            console.error(
                "KnowVia chat startup error:",
                error
            );

            setMatchesState("error");
        }
    })();

    console.log(
        "KnowVia real-time chat loaded."
    );
});