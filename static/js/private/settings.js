
document.addEventListener("DOMContentLoaded", () => {

    const settingIds = [
        "theme",
        "reminders",
        "messages",
        "learningStyle",
        "learningGoal",
        "visibility"
    ];

    const defaults = {
        theme: "dark",
        reminders: true,
        messages: true,
        learningStyle: "mixed",
        learningGoal: "30",
        visibility: "public"
    };

    const saveButton = document.getElementById("saveSettings");
    const saveMessage = document.getElementById("saveMessage");

    function loadSettings() {
        settingIds.forEach(id => {
            const element = document.getElementById(id);
            const storedValue = localStorage.getItem("cognilearn_" + id);

            const value = storedValue !== null
                ? JSON.parse(storedValue)
                : defaults[id];

            if (element.type === "checkbox") {
                element.checked = value;
            } else {
                element.value = value;
            }
        });

        applyTheme();
    }

    function saveSettings() {
        settingIds.forEach(id => {
            const element = document.getElementById(id);

            const value = element.type === "checkbox"
                ? element.checked
                : element.value;

            localStorage.setItem(
                "cognilearn_" + id,
                JSON.stringify(value)
            );
        });

        applyTheme();

        saveMessage.textContent = "Settings saved successfully!";

        setTimeout(() => {
            saveMessage.textContent = "";
        }, 3000);
    }

    function applyTheme() {
        const selectedTheme = document.getElementById("theme").value;

        const isLight = selectedTheme === "light" ||
            (selectedTheme === "system" &&
            window.matchMedia("(prefers-color-scheme: light)").matches);

        document.body.classList.toggle("light-theme", isLight);
    }

    saveButton.addEventListener("click", saveSettings);

    document.getElementById("theme").addEventListener(
        "change",
        applyTheme
    );

    loadSettings();

});
