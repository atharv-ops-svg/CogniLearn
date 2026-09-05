document.addEventListener("DOMContentLoaded", () => {

    // =====================================================
    // ELEMENTS
    // =====================================================

    const aboutInput = document.getElementById("about-input");
    const aboutCount = document.getElementById("about-count");
    const saveAbout = document.getElementById("save-about");
    const aboutStatus = document.getElementById("about-status");

    const knowsInput = document.getElementById("knows-input");
    const wantsInput = document.getElementById("wants-input");

    const addKnows = document.getElementById("add-knows");
    const addWants = document.getElementById("add-wants");

    const knowsTags = document.getElementById("knows-tags");
    const wantsTags = document.getElementById("wants-tags");

    const knowsCount = document.getElementById("knows-count");
    const wantsCount = document.getElementById("wants-count");

    const saveSkills = document.getElementById("save-skills");
    const skillsStatus = document.getElementById("skills-status");

    const deleteAccount = document.getElementById("delete-account");


    // =====================================================
    // INITIAL DATA
    // =====================================================

    const profileData =
        window.KNOWVIA_PROFILE || {};

    let knows = Array.isArray(profileData.knows)
        ? [...profileData.knows]
        : [];

    let wantsToLearn = Array.isArray(profileData.wantsToLearn)
        ? [...profileData.wantsToLearn]
        : [];


    // =====================================================
    // STATUS
    // =====================================================

    function showStatus(
        element,
        message,
        duration = 2500
    ) {

        if (!element) {
            return;
        }

        element.textContent = message;

        if (duration > 0) {

            window.setTimeout(() => {

                if (element.textContent === message) {
                    element.textContent = "";
                }

            }, duration);
        }
    }


    // =====================================================
    // ABOUT COUNTER
    // =====================================================

    function updateAboutCount() {

        if (!aboutInput || !aboutCount) {
            return;
        }

        aboutCount.textContent =
            `${aboutInput.value.length} / 1000`;
    }


    if (aboutInput) {

        aboutInput.addEventListener(
            "input",
            updateAboutCount
        );

        updateAboutCount();
    }


    // =====================================================
    // SAVE ABOUT
    // =====================================================

    async function saveAboutData() {

        if (!aboutInput || !saveAbout) {
            return;
        }

        const about =
            aboutInput.value.trim();

        saveAbout.disabled = true;

        showStatus(
            aboutStatus,
            "SAVING...",
            0
        );

        try {

            const response = await fetch(
                "/api/profile/about",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        about: about
                    })
                }
            );


            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to save."
                );
            }


            if (typeof data.about === "string") {

                aboutInput.value =
                    data.about;

                updateAboutCount();
            }


            showStatus(
                aboutStatus,
                "SAVED"
            );

        } catch (error) {

            console.error(
                "About save error:",
                error
            );

            showStatus(
                aboutStatus,
                error.message ||
                "SAVE FAILED"
            );

        } finally {

            saveAbout.disabled = false;
        }
    }


    if (saveAbout) {

        saveAbout.addEventListener(
            "click",
            saveAboutData
        );
    }


    // =====================================================
    // ADD SKILL
    // =====================================================

    function addSkill(
        input,
        skillArray,
        renderFunction
    ) {

        if (!input) {
            return;
        }

        const value =
            input.value.trim();

        if (!value) {
            return;
        }


        const alreadyExists =
            skillArray.some(
                skill =>
                    skill.toLowerCase() ===
                    value.toLowerCase()
            );


        if (alreadyExists) {

            input.value = "";

            renderFunction();

            return;
        }


        if (skillArray.length >= 50) {
            return;
        }


        skillArray.push(value);

        input.value = "";

        renderFunction();
    }


    // =====================================================
    // REMOVE SKILL
    // =====================================================

    function removeSkill(
        skillArray,
        index,
        renderFunction
    ) {

        if (
            index < 0 ||
            index >= skillArray.length
        ) {
            return;
        }

        skillArray.splice(
            index,
            1
        );

        renderFunction();
    }


    // =====================================================
    // RENDER SKILLS
    // =====================================================

    function renderSkillTags(
        container,
        skillArray,
        countElement
    ) {

        if (!container) {
            return;
        }

        container.replaceChildren();


        skillArray.forEach(
            (skill, index) => {

                const tag =
                    document.createElement(
                        "span"
                    );

                tag.className =
                    "skill-tag";


                const text =
                    document.createElement(
                        "span"
                    );

                text.className =
                    "skill-tag-text";

                text.textContent =
                    skill;


                const remove =
                    document.createElement(
                        "button"
                    );

                remove.type =
                    "button";

                remove.className =
                    "skill-remove";

                remove.textContent =
                    "×";

                remove.setAttribute(
                    "aria-label",
                    `Remove ${skill}`
                );


                remove.addEventListener(
                    "click",
                    () => {

                        removeSkill(
                            skillArray,
                            index,
                            renderAllSkills
                        );
                    }
                );


                tag.appendChild(
                    text
                );

                tag.appendChild(
                    remove
                );

                container.appendChild(
                    tag
                );
            }
        );


        if (countElement) {

            countElement.textContent =
                skillArray.length;
        }
    }


    // =====================================================
    // RENDER ALL SKILLS
    // =====================================================

    function renderAllSkills() {

        renderSkillTags(
            knowsTags,
            knows,
            knowsCount
        );

        renderSkillTags(
            wantsTags,
            wantsToLearn,
            wantsCount
        );
    }


    renderAllSkills();


    // =====================================================
    // ADD BUTTONS
    // =====================================================

    if (addKnows) {

        addKnows.addEventListener(
            "click",
            () => {

                addSkill(
                    knowsInput,
                    knows,
                    renderAllSkills
                );
            }
        );
    }


    if (addWants) {

        addWants.addEventListener(
            "click",
            () => {

                addSkill(
                    wantsInput,
                    wantsToLearn,
                    renderAllSkills
                );
            }
        );
    }


    // =====================================================
    // ENTER TO ADD SKILL
    // =====================================================

    if (knowsInput) {

        knowsInput.addEventListener(
            "keydown",
            (event) => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    addSkill(
                        knowsInput,
                        knows,
                        renderAllSkills
                    );
                }
            }
        );
    }


    if (wantsInput) {

        wantsInput.addEventListener(
            "keydown",
            (event) => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    addSkill(
                        wantsInput,
                        wantsToLearn,
                        renderAllSkills
                    );
                }
            }
        );
    }


    // =====================================================
    // SAVE SKILLS
    // =====================================================

    async function saveSkillsData() {

        if (!saveSkills) {
            return;
        }

        saveSkills.disabled = true;

        showStatus(
            skillsStatus,
            "SAVING...",
            0
        );


        try {

            const response = await fetch(
                "/api/profile/skills",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        knows: knows,
                        wants_to_learn:
                            wantsToLearn
                    })
                }
            );


            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to save."
                );
            }


            if (Array.isArray(data.knows)) {

                knows = [
                    ...data.knows
                ];
            }


            if (
                Array.isArray(
                    data.wants_to_learn
                )
            ) {

                wantsToLearn = [
                    ...data.wants_to_learn
                ];
            }


            renderAllSkills();


            showStatus(
                skillsStatus,
                "SAVED"
            );

        } catch (error) {

            console.error(
                "Skills save error:",
                error
            );

            showStatus(
                skillsStatus,
                error.message ||
                "SAVE FAILED"
            );

        } finally {

            saveSkills.disabled = false;
        }
    }


    if (saveSkills) {

        saveSkills.addEventListener(
            "click",
            saveSkillsData
        );
    }


    // =====================================================
    // DELETE ACCOUNT
    // =====================================================

    async function deleteAccountData() {

        if (!deleteAccount) {
            return;
        }


        const firstConfirmation =
            window.confirm(
                "Delete your KnowVia account?\n\n" +
                "This will permanently delete your " +
                "account, profile information, skills, " +
                "learning goals, and saved KV AI conversations.\n\n" +
                "This action cannot be undone."
            );


        if (!firstConfirmation) {
            return;
        }


        const secondConfirmation =
            window.confirm(
                "Are you absolutely sure?\n\n" +
                "Your KnowVia account and saved KV AI " +
                "conversations will be permanently deleted."
            );


        if (!secondConfirmation) {
            return;
        }


        deleteAccount.disabled = true;

        deleteAccount.textContent =
            "Deleting...";


        try {

            const response = await fetch(
                "/api/profile/delete-account",
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );


            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to delete account."
                );
            }


            if (data.success) {

                window.location.href =
                    "/";
            }

        } catch (error) {

            console.error(
                "Delete account error:",
                error
            );

            deleteAccount.disabled = false;

            deleteAccount.textContent =
                "Delete Account";

            window.alert(
                error.message ||
                "Unable to delete your account. Please try again."
            );
        }
    }


    if (deleteAccount) {

        deleteAccount.addEventListener(
            "click",
            deleteAccountData
        );
    }

});