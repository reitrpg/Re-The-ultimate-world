/**
 * World Creator
 * Upgrade UI
 */

import UpgradeManager from "../upgrades/Manager.js";
import Formatter from "../utils/Formatter.js";
import SettingsManager from "../settings/Manager.js";
import eventBus from "../core/eventBus.js";

class UpgradeUI {
    constructor() {
        this.initialized = false;
        this.category = "infinite";
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;
        this.registerEvents();

        eventBus.on("action:upgrade:category", payload => {
            const categoryButton = payload?.target?.closest?.("[data-upgrade-category]");
            if (categoryButton) this.setCategory(categoryButton.dataset.upgradeCategory);
        });

        eventBus.on("action:upgrade:buy", payload => {
            const buyButton = payload?.target?.closest?.("[data-action='upgrade:buy']");
            if (buyButton) UpgradeManager.buy(buyButton.dataset.upgradeId);
        });

        eventBus.on("action:upgrade:buy-all", payload => {
            const buyButton = payload?.target?.closest?.("[data-action='upgrade:buy-all']");
            if (buyButton) UpgradeManager.buyAll(buyButton.dataset.upgradeId);
        });

        this.render();
    }

    registerEvents() {
        eventBus.on("upgrade:update", () => this.render());
        eventBus.on("ep:update", () => this.refreshAffordability());
        eventBus.on("resource:update", () => this.refreshAffordability());
        eventBus.on("settings:update", payload => {
            if (!payload || payload.key === "showMaxedUpgrades") this.render();
        });
    }

    setCategory(category) {
        if (category !== "infinite" && category !== "limited") return;
        this.category = category;
        this.render();
    }

    renderCategory() {
        document.querySelectorAll("[data-upgrade-category-panel]").forEach(panel => {
            panel.hidden = panel.dataset.upgradeCategoryPanel !== this.category;
        });

        document.querySelectorAll("[data-upgrade-category]").forEach(button => {
            const active = button.dataset.upgradeCategory === this.category;
            button.classList.toggle("active", active);
            button.setAttribute("aria-selected", String(active));
        });
    }

    createUpgradeElement(upgrade) {
        const item = document.createElement("div");
        item.className = "upgrade-item";
        item.dataset.upgradeId = upgrade.id;

        const title = document.createElement("h3");
        title.textContent = upgrade.name;

        const cost = document.createElement("p");
        if (!upgrade.isUnlocked()) {
            cost.textContent = "解禁条件 : " + (upgrade.getUnlockConditionText?.() || "解禁条件を満たしていません");
        } else if (upgrade.isMaxed()) {
            cost.textContent = "コスト : ―";
        } else if (upgrade.getCostResource?.()) {
            cost.textContent = "コスト : " + Formatter.format(upgrade.getCost()) + " " +
                ({ plant: "植物", metal: "金属", magic: "魔力" }[upgrade.getCostResource()] || "");
        } else {
            cost.textContent = "コスト : " + Formatter.format(upgrade.getCost()) + " EP";
        }

        const level = document.createElement("p");
        level.textContent = upgrade.maxLevel === null
            ? "Lv " + upgrade.level
            : "Lv " + upgrade.level + "/" + upgrade.maxLevel;

        const effect = document.createElement("p");
        const effectText = upgrade.getEffectText?.() || "";
        effect.textContent = "効果 : ×" + Formatter.format(upgrade.getMultiplier()) +
            (effectText ? " / " + effectText : "");

        item.append(title, cost, level, effect);

        const actions = document.createElement("div");
        actions.className = "upgrade-actions";

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = !upgrade.isUnlocked() ? "未解禁" : upgrade.isMaxed() ? "上限" : "購入";
        button.disabled = !upgrade.isUnlocked() || upgrade.isMaxed() || !upgrade.canBuy();
        button.dataset.action = "upgrade:buy";
        button.dataset.upgradeId = upgrade.id;
        actions.appendChild(button);

        if (upgrade.type === "infinite" && UpgradeManager.get("buy_max_" + upgrade.id)?.level >= 1) {
            const buyAll = document.createElement("button");
            buyAll.type = "button";
            buyAll.textContent = "全購入";
            buyAll.dataset.action = "upgrade:buy-all";
            buyAll.dataset.upgradeId = upgrade.id;
            buyAll.disabled = !upgrade.isUnlocked() || !upgrade.canBuy();
            actions.appendChild(buyAll);
        }
        item.appendChild(actions);

        return item;
    }

    renderList(containerId, upgrades) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = "";

        const showMaxed = SettingsManager.get("showMaxedUpgrades") === true;
        const visibleUpgrades = upgrades.filter(upgrade => showMaxed || !upgrade.isMaxed());

        if (visibleUpgrades.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "現在、対象の強化はありません。";
            container.appendChild(empty);
            return;
        }

        visibleUpgrades.forEach(upgrade => container.appendChild(this.createUpgradeElement(upgrade)));
    }

    refreshAffordability() {
        document.querySelectorAll(".upgrade-item[data-upgrade-id]").forEach(item => {
            const upgrade = UpgradeManager.get(item.dataset.upgradeId);
            const button = item.querySelector("[data-action='upgrade:buy']");
            if (upgrade && button) {
                button.disabled = !upgrade.isUnlocked() || upgrade.isMaxed() || !upgrade.canBuy();
            }

            const buyAll = item.querySelector("[data-action='upgrade:buy-all']");
            if (upgrade && buyAll) buyAll.disabled = !upgrade.isUnlocked() || !upgrade.canBuy();
        });
    }

    render() {
        this.renderCategory();
        this.renderList("upgrade-infinite-list", UpgradeManager.getByType("infinite"));
        this.renderList("upgrade-limited-list", UpgradeManager.getByType("limited"));
    }
}

export default new UpgradeUI();
