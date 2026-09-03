/* =========================================================
   KNOWVIA — PROFILE V2
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
       ===================================================== */

    const aboutInput =
        document.getElementById("about-input");

    const aboutCount =
        document.getElementById("about-count");

    const saveAbout =
        document.getElementById("save-about");

    const aboutStatus =
        document.getElementById("about-status");


    const knowsInput =
        document.getElementById("knows-input");

    const wantsInput =
        document.getElementById("wants-input");

    const addKnows =
        document.getElementById("add-knows");

    const addWants =
        document.getElementById("add-wants");

    const knowsTags =
        document.getElementById("knows-tags");

    const wantsTags =
        document.getElementById("wants-tags");

    const knowsCount =
        document.getElementById("knows-count");

    const wantsCount =
        document.getElementById("wants-count");

    const saveSkills =
        document.getElementById("save-skills");

    const skillsStatus =
        document.getElementById("skills-status");


    /* =====================================================
       INITIAL DATA
       ===================================================== */

    let knows = JSON.parse('{{ user.knows | tojson | safe }}');

    let wantsToLearn =
        JSON.parse('{{ user.wants_to_learn | tojson | safe }}');


    /*
     * Make sure the variables are always arrays.
     */

    if (!Array.isArray(knows)) {
        knows = [];
    }

    if (!Array.isArray(wantsToLearn)) {
        wantsToLearn = [];
    }


    /* =====================================================
       UTILITY
       ===================================================== */

    function cleanSkill(skill) {

        return String(skill || "")
            .trim()
            .replace(/\s+/g, " ");

    }


    function skillExists(
        array,
        skill
    ) {

        return array.some(
            item =>
                item.toLowerCase() ===
                skill.toLowerCase()
        );

    }


    /* =====================================================
       ABOUT COUNTER
       ===================================================== */

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


    /* =====================================================
       STATUS
       ===================================================== */

    function showStatus(
        element,
        message,
        duration = 2500
    ) {

        if (!element) {
            return;
        }

        element.textContent =
            message;


        if (duration > 0) {

            setTimeout(() => {

                if (
                    element.textContent ===
                    message
                ) {

                    element.textContent =
                        "";

                }

            }, duration);

        }

    }


    /* =====================================================
       RENDER SKILLS
       ===================================================== */

    function renderSkills(
        skills,
        container,
        countElement,
        type
    ) {

        if (
            !container ||
            !countElement
        ) {
            return;
        }


        container.innerHTML = "";


        countElement.textContent =
            skills.length;


        if (skills.length === 0) {

            const empty =
                document.createElement("div");

            empty.className =
                "empty-skills";

            empty.textContent =
                type === "knows"
                    ? "No skills added yet. What can you teach?"
                    : "No learning goals yet. What do you want to learn?";

            container.appendChild(
                empty
            );

            return;
        }


        skills.forEach(
            (skill, index) => {

                const tag =
                    document.createElement("div");

                tag.className =
                    "skill-tag";


                const text =
                    document.createElement("span");

                text.textContent =
                    skill;


                const remove =
                    document.createElement("button");

                remove.type =
                    "button";

                remove.className =
                    "remove-skill";

                remove.textContent =
                    "×";

                remove.setAttribute(
                    "aria-label",
                    `Remove ${skill}`
                );


                remove.addEventListener(
                    "click",
                    () => {

                        skills.splice(
                            index,
                            1
                        );

                        renderAllSkills();

                    }
                );


                tag.appendChild(text);

                tag.appendChild(remove);

                container.appendChild(tag);

            }
        );

    }


    function renderAllSkills() {

        renderSkills(
            knows,
            knowsTags,
            knowsCount,
            "knows"
        );


        renderSkills(
            wantsToLearn,
            wantsTags,
            wantsCount,
            "wants"
        );

    }


    /* =====================================================
       ADD SKILL
       ===================================================== */

    function addSkill(
        input,
        array
    ) {

        if (!input) {
            return;
        }


        const skill =
            cleanSkill(
                input.value
            );


        if (!skill) {

            input.focus();

            return;

        }


        if (
            skillExists(
                array,
                skill
            )
        ) {

            input.value = "";

            input.focus();

            return;

        }


        array.push(skill);

        input.value = "";

        renderAllSkills();

        input.focus();

    }


    /* KNOWS */

    if (addKnows) {

        addKnows.addEventListener(
            "click",
            () => {

                addSkill(
                    knowsInput,
                    knows
                );

            }
        );

    }


    if (knowsInput) {

        knowsInput.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();

                    addSkill(
                        knowsInput,
                        knows
                    );

                }

            }
        );

    }


    /* WANTS */

    if (addWants) {

        addWants.addEventListener(
            "click",
            () => {

                addSkill(
                    wantsInput,
                    wantsToLearn
                );

            }
        );

    }


    if (wantsInput) {

        wantsInput.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();

                    addSkill(
                        wantsInput,
                        wantsToLearn
                    );

                }

            }
        );

    }


    /* =====================================================
       SAVE ABOUT
       ===================================================== */

    async function saveAboutData() {

        if (!aboutInput || !saveAbout) {
            return;
        }


        const about =
            aboutInput.value.trim();


        saveAbout.disabled =
            true;


        showStatus(
            aboutStatus,
            "SAVING...",
            0
        );


        try {

            const response =
                await fetch(
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


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to save."
                );

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

            saveAbout.disabled =
                false;

        }

    }


    if (saveAbout) {

        saveAbout.addEventListener(
            "click",
            saveAboutData
        );

    }


    /* =====================================================
       SAVE SKILLS
       ===================================================== */

    async function saveSkillsData() {

        if (!saveSkills) {
            return;
        }


        saveSkills.disabled =
            true;


        showStatus(
            skillsStatus,
            "SAVING...",
            0
        );


        try {

            const response =
                await fetch(
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


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to save."
                );

            }


            /*
             * Use the cleaned values returned
             * by the backend.
             */

            if (
                Array.isArray(
                    data.knows
                )
            ) {

                knows =
                    data.knows;

            }


            if (
                Array.isArray(
                    data.wants_to_learn
                )
            ) {

                wantsToLearn =
                    data.wants_to_learn;

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

            saveSkills.disabled =
                false;

        }

    }


    if (saveSkills) {

        saveSkills.addEventListener(
            "click",
            saveSkillsData
        );

    }


    /* =====================================================
       INITIAL RENDER
       ===================================================== */

    renderAllSkills();

});