import WorldManager from "../world/Manager.js";
import UnlockManager from "../world/UnlockManager.js";
import Formatter from "../utils/Formatter.js";
import eventBus from "../core/eventBus.js";

class WorldUI {
    constructor() {
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        this.initialized = true;
        this.registerEvents();
        this.render();
    }

    registerEvents() {
        eventBus.on("world:update", () => this.render());
        eventBus.on("world:unlock", () => this.render());

        eventBus.on("world:unlock:failed", failure => {
            if (!failure) return;

            eventBus.emit("notification:show", {
                type: "warning",
                message: this.getUnlockFailureMessage(failure)
            });
        });

        eventBus.on("world:create:success", () => this.render());
        eventBus.on("world:create:failed", () => this.render());
    }

    getUnlockFailureMessage(failure) {
        switch (failure.code) {
            case "INSUFFICIENT_EP":
                return "EPが不足しています。必要: " +
                    Formatter.format(failure.required) +
                    " / 現在: " +
                    Formatter.format(failure.current);

            case "EP_CONSUME_FAILED":
                return "EPの消費に失敗しました。もう一度試してください。";

            default:
                return "世界の解放に失敗しました。";
        }
    }

    renderWorldList() {
        const container = document.getElementById("world-list");
        if (!container) return;

        container.innerHTML = "";

        WorldManager.getAll().forEach((world, index) => {
            const item = document.createElement("div");
            const button = document.createElement("button");

            button.type = "button";
            button.textContent = world.name;
            button.dataset.worldIndex = String(index);

            item.innerHTML =
                "<p>Lv " + world.level + "</p>" +
                "<p>★ " + world.rarity + "</p>";

            item.appendChild(button);
            container.appendChild(item);
        });
    }

    renderActiveWorld() {
        const world = WorldManager.getActive();
        if (!world) return;

        const name = document.getElementById("world-name");
        const level = document.getElementById("world-level");
        const rarity = document.getElementById("world-rarity");

        if (name) name.textContent = world.name;
        if (level) level.textContent = world.level;
        if (rarity) rarity.textContent = world.rarity;
    }

    renderUnlockCost() {
        const element = document.getElementById("unlock-cost");
        if (!element) return;

        element.textContent = Formatter.format(
            UnlockManager.getUnlockCost()
        );
    }

    render() {
        this.renderActiveWorld();
        this.renderWorldList();
        this.renderUnlockCost();
    }
}

export default new WorldUI();
