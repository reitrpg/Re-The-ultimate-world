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

    getAchievementIcon(achievement, index) {
        const icons = {
            first_world: "◇",
            first_upgrade: "◆",
            first_research: "✦",
            first_rebirth: "↻",
            ep_1000: "E",
            resource_10000: "◆",
            world_level_10: "10"
        };

        return icons[achievement.id] || String(index + 1);
    }

    render() {
        const container = document.getElementById("achievement-content");
        if (!container) return;

        container.innerHTML = "";

        const header = document.createElement("div");
        header.className = "achievement-header";

        const summary = document.createElement("div");
        summary.className = "achievement-summary";
        summary.textContent =
            "達成数 " +
            AchievementManager.getAchievedCount() +
            " / " +
            AchievementManager.getAll().length;

        const multiplier = document.createElement("div");
        multiplier.className = "achievement-multiplier";
        multiplier.textContent =
            "実績倍率 ×" +
            AchievementManager.getTotalMultiplier().toFixed(4);

        header.append(summary, multiplier);
        container.appendChild(header);

        const grid = document.createElement("div");
        grid.className = "achievement-grid";

        AchievementManager.getAll().forEach((achievement, index) => {
            const achieved = achievement.isAchieved();

            const item = document.createElement("article");
            item.className =
                "achievement-card" +
                (achieved ? " achieved" : " locked");

            item.title = achievement.description;

            const number = document.createElement("span");
            number.className = "achievement-number";
            number.textContent = String(index + 1);

            const icon = document.createElement("div");
            icon.className = "achievement-icon";
            icon.textContent = this.getAchievementIcon(achievement, index);

            const title = document.createElement("h3");
            title.className = "achievement-title";
            title.textContent = achievement.name;

            const description = document.createElement("p");
            description.className = "achievement-description";
            description.textContent = achievement.description;

            const status = document.createElement("span");
            status.className = "achievement-status";
            status.textContent = achieved ? "達成" : "未達成";

            item.append(number, icon, title, description, status);

            if (achievement.unlockEffects.length > 0) {
                const unlock = document.createElement("span");
                unlock.className = "achievement-effect";
                unlock.textContent = "解禁効果";
                item.appendChild(unlock);
            }

            grid.appendChild(item);
        });

        container.appendChild(grid);
    }
}

export default new AchievementUI();
