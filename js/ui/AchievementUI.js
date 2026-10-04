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

        eventBus.on("action:achievement:open", payload => {
            const id = payload?.target?.dataset?.achievementId;
            if (id) this.openModal(id);
        });

        eventBus.on("action:achievement:close", () => {
            this.closeModal();
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

    closeModal() {
        const modal = document.getElementById("achievement-modal");
        if (modal) modal.remove();
    }

    openModal(id) {
        const achievement = AchievementManager.get(id);
        if (!achievement) return;

        this.closeModal();

        const achieved = achievement.isAchieved();

        const overlay = document.createElement("div");
        overlay.id = "achievement-modal";
        overlay.className = "achievement-modal";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", achievement.name);

        const panel = document.createElement("div");
        panel.className = "achievement-modal-panel";

        const close = document.createElement("button");
        close.type = "button";
        close.className = "achievement-modal-close";
        close.dataset.action = "achievement:close";
        close.textContent = "×";
        close.setAttribute("aria-label", "閉じる");

        const title = document.createElement("h2");
        title.textContent = achievement.name;

        const status = document.createElement("p");
        status.className = achieved
            ? "achievement-modal-status achieved"
            : "achievement-modal-status locked";
        status.textContent = achieved ? "達成済み" : "未達成";

        const conditionTitle = document.createElement("h3");
        conditionTitle.textContent = "解除方法";

        const condition = document.createElement("p");
        condition.className = "achievement-modal-condition";
        condition.textContent = achievement.description;

        panel.append(close, title, status, conditionTitle, condition);

        if (achievement.unlockEffects.length > 0) {
            const bonusTitle = document.createElement("h3");
            bonusTitle.textContent = "解禁ボーナス";

            const bonusList = document.createElement("ul");
            bonusList.className = "achievement-modal-bonus-list";

            achievement.unlockEffects.forEach(effect => {
                const item = document.createElement("li");

                if (effect?.type === "unlock" && effect?.target === "upgrade") {
                    const upgrade = AchievementManager.getUnlockTargetName?.(effect.id);
                    item.textContent = upgrade
                        ? upgrade + "を解禁"
                        : "強化「" + effect.id + "」を解禁";
                } else {
                    item.textContent = "特殊ボーナス";
                }

                bonusList.appendChild(item);
            });

            panel.append(bonusTitle, bonusList);
        } else {
            const noBonus = document.createElement("p");
            noBonus.className = "achievement-modal-no-bonus";
            noBonus.textContent = "解禁ボーナスなし";
            panel.appendChild(noBonus);
        }

        const multiplier = document.createElement("p");
        multiplier.className = "achievement-modal-multiplier";
        multiplier.textContent = "実績全体倍率：×" +
            AchievementManager.getTotalMultiplier().toFixed(4);
        panel.appendChild(multiplier);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        overlay.addEventListener("pointerdown", event => {
            if (event.target === overlay) {
                this.closeModal();
            }
        });

        document.addEventListener("keydown", this.handleEscape = event => {
            if (event.key === "Escape") {
                this.closeModal();
                document.removeEventListener("keydown", this.handleEscape);
            }
        }, { once: true });
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

            item.dataset.action = "achievement:open";
            item.dataset.achievementId = achievement.id;
            item.setAttribute("role", "button");
            item.tabIndex = 0;
            item.title = "タップして詳細を表示";

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
