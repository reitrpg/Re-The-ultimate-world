import eventBus from "../core/eventBus.js";
import AchievementManager from "../achievements/Manager.js";

class AchievementUI {
    constructor() {
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;

        [
            "achievement:update",
            "achievement:achieved"
        ].forEach(event => {
            eventBus.on(event, () => this.render());
        });

        this.render();
    }

    render() {
        const container = document.getElementById("achievement-content");
        if (!container) return;

        container.innerHTML = "";

        const summary = document.createElement("p");
        summary.textContent =
            "達成数: " +
            AchievementManager.getAchievedCount() +
            " / " +
            AchievementManager.getAll().length;

        const multiplier = document.createElement("p");
        multiplier.textContent =
            "実績倍率: ×" +
            AchievementManager.getTotalMultiplier().toFixed(4);

        container.appendChild(summary);
        container.appendChild(multiplier);

        AchievementManager.getAll().forEach(achievement => {
            const item = document.createElement("div");
            item.className = "achievement-item";

            const title = document.createElement("h3");
            title.textContent =
                (achievement.isAchieved() ? "✓ " : "□ ") +
                achievement.name;

            const description = document.createElement("p");
            description.textContent = achievement.description;

            const status = document.createElement("p");
            status.textContent = achievement.isAchieved()
                ? "達成済み"
                : "未達成";

            item.appendChild(title);
            item.appendChild(description);
            item.appendChild(status);

            container.appendChild(item);
        });
    }
}

export default new AchievementUI();
