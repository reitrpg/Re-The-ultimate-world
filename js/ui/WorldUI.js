import WorldManager from "../world/Manager.js";
import UnlockManager from "../world/UnlockManager.js";
import Formatter from "../utils/Formatter.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
import eventBus from "../core/eventBus.js";

class WorldUI {
    constructor() { this.initialized = false; this.category = "world"; }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;
        this.registerEvents();
        this.registerCategoryInput();
        this.render();
    }

    registerCategoryInput() {
        document.addEventListener("click", event => {
            const button = event.target?.closest("[data-world-category]");
            if (!button) return;
            this.setCategory(button.dataset.worldCategory);
        }, true);
    }

    setCategory(category) {
        if (category !== "world" && category !== "converter") return;
        this.category = category;
        this.renderCategory();
    }

    renderCategory() {
        document.querySelectorAll("[data-world-category-panel]").forEach(panel => {
            panel.hidden = panel.dataset.worldCategoryPanel !== this.category;
        });
        document.querySelectorAll("[data-world-category]").forEach(button => {
            const active = button.dataset.worldCategory === this.category;
            button.classList.toggle("active", active);
            button.setAttribute("aria-selected", String(active));
        });
    }

    registerEvents() {
        ["world:update","world:unlock","world:create:success","world:create:failed","resource:update","research:update","upgrade:update","rebirth:update"].forEach(event => {
            eventBus.on(event, () => this.render());
        });
        eventBus.on("world:unlock:failed", failure => {
            if (!failure) return;
            eventBus.emit("notification:show", {
                type: "warning",
                message: this.getUnlockFailureMessage(failure)
            });
        });
    }

    getUnlockFailureMessage(failure) {
        switch (failure.code) {
            case "INSUFFICIENT_EP":
                return "EPが不足しています。必要: " + Formatter.format(failure.required) + " / 現在: " + Formatter.format(failure.current);
            case "EP_CONSUME_FAILED":
                return "EPの消費に失敗しました。もう一度試してください。";
            default:
                return "世界の解放に失敗しました。";
        }
    }

    renameWorld(index) {
        const world = WorldManager.get(index);
        if (!world) return;
        const name = window.prompt("世界名を入力してください", world.name);
        if (name === null) return;
        const trimmed = name.trim();
        if (!trimmed) return;
        world.name = trimmed;
        eventBus.emit("world:update");
    }

    createWorldCard(world, index) {
        const card = document.createElement("article");
        card.className = "world-card";

        const nameRow = document.createElement("div");
        nameRow.className = "world-name-row";
        const name = document.createElement("span");
        name.textContent = world.name;

        const renameButton = document.createElement("button");
        renameButton.type = "button";
        renameButton.className = "world-rename-button";
        renameButton.textContent = "✎";
        renameButton.setAttribute("aria-label", "世界名を変更");
        renameButton.addEventListener("click", event => {
            event.stopPropagation();
            this.renameWorld(index);
        });

        nameRow.appendChild(name);
        nameRow.appendChild(renameButton);

        const stats = document.createElement("div");
        stats.className = "world-stats";
        const rarity = document.createElement("p");
        rarity.textContent = "レアリティ: " + world.rarity;
        const level = document.createElement("p");
        level.textContent = "Lv: " + world.level;
        stats.appendChild(rarity);
        stats.appendChild(level);

        const production = document.createElement("div");
        production.className = "world-production";
        const productionTitle = document.createElement("p");
        productionTitle.textContent = "生産";
        const list = document.createElement("ul");
        const globalMultiplier = ResearchManager.getTotalMultiplier() * UpgradeManager.getTotalMultiplier();
        [["plant","植物"],["metal","金属"],["magic","魔力"]].forEach(([id,label]) => {
            const item = document.createElement("li");
            const rate = world.getResourceProduction(id) * globalMultiplier;
            item.textContent = label + ": +" + Formatter.format(rate) + "/秒 (×" + world.getResourceMultiplier(id) + ")";
            list.appendChild(item);
        });
        production.appendChild(productionTitle);
        production.appendChild(list);

        card.appendChild(nameRow);
        card.appendChild(stats);
        card.appendChild(production);
        card.addEventListener("click", () => WorldManager.setActive(index));

        if (index === WorldManager.getActiveIndex()) {
            card.classList.add("active");
            card.setAttribute("aria-current", "true");
        }
        return card;
    }

    renderWorldList() {
        const container = document.getElementById("world-list");
        if (!container) return;
        container.innerHTML = "";
        WorldManager.getAll().forEach((world, index) => {
            container.appendChild(this.createWorldCard(world, index));
        });
    }

    renderNextWorld() {
        const container = document.getElementById("next-world");
        if (!container) return;
        const cost = UnlockManager.getUnlockCost();
        container.innerHTML = "";
        const costText = document.createElement("p");
        costText.className = "next-world-cost";
        costText.textContent = "必要EP: " + Formatter.format(cost) + " EP";
        const button = document.createElement("button");
        button.id = "unlock-world";
        button.type = "button";
        button.dataset.action = "world:create:request";
        button.textContent = "世界作成";
        container.appendChild(costText);
        container.appendChild(button);
    }

    render() {
        this.renderCategory();
        this.renderWorldList();
        this.renderNextWorld();
    }
}

export default new WorldUI();