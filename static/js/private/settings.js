document.addEventListener("DOMContentLoaded", () => {
    const theme = document.getElementById("theme");
    const learningNotifications =
        document.getElementById("learningNotifications");
    const messageNotifications =
        document.getElementById("messageNotifications");
    const learningStyle = document.getElementById("learningStyle");
    const dailyGoal = document.getElementById("dailyGoal");
    const profileVisibility =
        document.getElementById("profileVisibility");

    const saveButton = document.getElementById("saveSettings");
    const saveMessage = document.getElementById("saveMessage");

    const keys = {
        theme: "cognilearn_theme",
        learningNotifications: "cognilearn_learning_notifications",
        messageNotifications: "cognilearn_message_notifications",
        learningStyle: "cognilearn_learning_style",
        dailyGoal: "cognilearn_daily_goal",
        profileVisibility: "cognilearn_profile_visibility"
    };

    function loadSettings() {
        theme.value = localStorage.getItem(keys.theme) || "light";

        learningNotifications.checked =
            localStorage.getItem(keys.learningNotifications) !== "false";

        messageNotifications.checked =
            localStorage.getItem(keys.messageNotifications) !== "false";

        learningStyle.value =
            localStorage.getItem(keys.learningStyle) || "mixed";

        dailyGoal.value =
            localStorage.getItem(keys.dailyGoal) || "30";

        profileVisibility.value =
            localStorage.getItem(keys.profileVisibility) || "public";
    }

    function applyTheme(selectedTheme) {
        document.documentElement.dataset.theme = selectedTheme;
        localStorage.setItem(keys.theme, selectedTheme);
    }

    // Apply theme immediately when changed.
    theme.addEventListener("change", () => {
        applyTheme(theme.value);
    });

    saveButton.addEventListener("click", () => {
        applyTheme(theme.value);

        localStorage.setItem(
            keys.learningNotifications,
            learningNotifications.checked
        );

        localStorage.setItem(
            keys.messageNotifications,
            messageNotifications.checked
        );

        localStorage.setItem(keys.learningStyle, learningStyle.value);
        localStorage.setItem(keys.dailyGoal, dailyGoal.value);
        localStorage.setItem(
            keys.profileVisibility,
            profileVisibility.value
        );

        saveMessage.textContent = "Settings saved successfully!";

        setTimeout(() => {
            saveMessage.textContent = "";
        }, 3000);
    });

    document.getElementById("deleteAccount").addEventListener("click", () => {
        alert("Account deletion is not available yet. Please contact support.");
    });

    loadSettings();
});