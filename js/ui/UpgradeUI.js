/**
 * World Creator
 * Upgrade UI
 */

import UpgradeManager from "../upgrades/Manager.js";
import Formatter from "../utils/Formatter.js";
import eventBus from "../core/eventBus.js";

class UpgradeUI {
    constructor() {
        this.initialized = false;
        this.category = "infinite";
    }

    initialize() {
        if (this.initialized) {
            return;
        }

        this.initialized = true;
        this.registerEvents();

        eventBus.on("action:upgrade:category", payload => {
            const categoryButton =
                payload?.target?.closest?.("[data-upgrade-category]");

            if (categoryButton) {
                this.setCategory(
                    categoryButton.dataset.upgradeCategory
                );
            }
        });

        eventBus.on("action:upgrade:buy", payload => {
            const buyButton =
                payload?.target?.closest?.("[data-action='upgrade:buy']");

            if (buyButton) {
                UpgradeManager.buy(buyButton.dataset.upgradeId);
            }
        });

        this.render();
    }

    registerEvents() {
        eventBus.on("upgrade:update", () => {
            this.render();
        });

        eventBus.on("ep:update", () => {
            this.render();
        });

        eventBus.on("resource:update", () => {
            this.render();
        });
    }

    setCategory(category) {
        if (category !== "infinite" && category !== "limited") {
            return;
        }

        this.category = category;
        this.render();
    }

    renderCategory() {
        document.querySelectorAll("[data-upgrade-category-panel]").forEach(
            panel => {
                panel.hidden =
                    panel.dataset.upgradeCategoryPanel !== this.category;
            }
        );

        document.querySelectorAll("[data-upgrade-category]").forEach(
            button => {
                const active =
                    button.dataset.upgradeCategory === this.category;

                button.classList.toggle("active", active);
                button.setAttribute(
                    "aria-selected",
                    String(active)
                );
            }
        );
    }

    createUpgradeElement(upgrade) {
        const item = document.createElement("div");
        item.className = "upgrade-item";

        const title = document.createElement("h3");
        title.textContent = upgrade.name;

        const cost = document.createElement("p");

        if (!upgrade.isUnlocked()) {
            const condition = upgrade.getUnlockConditionText?.() || "解禁条件を満たしていません";
            cost.textContent = "解禁条件 : " + condition;
        } else if (upgrade.isMaxed()) {
            cost.textContent = "コスト : ―";
        } else if (upgrade.getCostResource?.()) {
            cost.textContent =
                "コスト : " +
                Formatter.format(upgrade.getCost()) +
                " " +
                ({
                    plant: "植物",
                    metal: "金属",
                    magic: "魔力"
                }[upgrade.getCostResource()] || "");
        } else {
            cost.textContent =
                "コスト : " +
                Formatter.format(upgrade.getCost()) +
                " EP";
        }

        const level = document.createElement("p");
        if (upgrade.maxLevel === null) {
            level.textContent = "Lv " + upgrade.level;
        } else {
            level.textContent =
                "Lv " + upgrade.level + "/" + upgrade.maxLevel;
        }

        const effect = document.createElement("p");
        const effectText = upgrade.getEffectText?.() || "";

        effect.textContent =
            "効果 : ×" +
            Formatter.format(upgrade.getMultiplier()) +
            (effectText ? " / " + effectText : "");

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = !upgrade.isUnlocked()
            ? "未解禁"
            : upgrade.isMaxed()
                ? "上限"
                : "購入";

        button.disabled =
            !upgrade.isUnlocked() ||
            upgrade.isMaxed() ||
            !upgrade.canBuy();

        button.dataset.action = "upgrade:buy";
        button.dataset.upgradeId = upgrade.id;

        item.appendChild(title);
        item.appendChild(cost);
        item.appendChild(level);
        item.appendChild(effect);
        item.appendChild(button);

        return item;
    }

    renderList(containerId, upgrades) {
        const container = document.getElementById(containerId);

        if (!container) {
            return;
        }

        container.innerHTML = "";

        if (upgrades.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "現在、対象の強化はありません。";
            container.appendChild(empty);
            return;
        }

        upgrades.forEach(upgrade => {
            container.appendChild(
                this.createUpgradeElement(upgrade)
            );
        });
    }

    render() {
        this.renderCategory();

        this.renderList(
            "upgrade-infinite-list",
            UpgradeManager.getByType("infinite")
        );

        this.renderList(
            "upgrade-limited-list",
            UpgradeManager.getByType("limited")
        );
    }
}

export default new UpgradeUI();
