/**
 * World Creator
 * World UI
 */

import WorldManager from "../world/Manager.js";
import UnlockManager from "../world/UnlockManager.js";
import Formatter from "../utils/Formatter.js";
import eventBus from "../core/eventBus.js";

class WorldUI {
    constructor() {
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) {
            return;
        }

        this.initialized = true;
        this.registerEvents();
        this.registerButtons();
        this.render();
    }

    registerEvents() {
        eventBus.on("world:update", () => {
            this.render();
        });

        eventBus.on("world:unlock", () => {
            this.render();
        });

        // 押下処理と世界生成処理を分離する。
        // ボタン側は要求イベントだけを発火し、実際の生成処理はここから開始する。
        eventBus.on("world:create:request", (payload = {}) => {
            const seed = payload.seed ?? Date.now().toString();
            const created = UnlockManager.unlock(seed);

            eventBus.emit(
                created
                    ? "world:create:success"
                    : "world:create:failed",
                {
                    seed,
                    cost: UnlockManager.getUnlockCost()
                }
            );
        });

        eventBus.on("world:create:success", () => {
            this.render();
        });

        eventBus.on("world:create:failed", () => {
            this.render();
        });
    }

    registerButtons() {
        const button = document.getElementById("unlock-world");

        if (!button) {
            return;
        }

        button.addEventListener("click", () => {
            eventBus.emit("world:create:request", {
                seed: Date.now().toString()
            });
        });
    }

    renderWorldList() {
        const container = document.getElementById("world-list");

        if (!container) {
            return;
        }

        container.innerHTML = "";

        WorldManager.getAll().forEach((world, index) => {
            const item = document.createElement("div");
            const button = document.createElement("button");

            button.type = "button";
            button.textContent = world.name;

            button.addEventListener("click", () => {
                WorldManager.setActive(index);
            });

            item.innerHTML = `
                <p>Lv ${world.level}</p>
                <p>★ ${world.rarity}</p>
            `;

            item.appendChild(button);
            container.appendChild(item);
        });
    }

    renderActiveWorld() {
        const world = WorldManager.getActive();

        if (!world) {
            return;
        }

        const name = document.getElementById("world-name");
        const level = document.getElementById("world-level");
        const rarity = document.getElementById("world-rarity");

        if (name) {
            name.textContent = world.name;
        }

        if (level) {
            level.textContent = world.level;
        }

        if (rarity) {
            rarity.textContent = world.rarity;
        }
    }

    renderUnlockCost() {
        const element = document.getElementById("unlock-cost");

        if (!element) {
            return;
        }

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
