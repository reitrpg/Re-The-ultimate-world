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

        eventBus.on(

            "world:update",

            () => {

                this.render();

            }

        );

        eventBus.on(

            "world:unlock",

            () => {

                this.render();

            }

        );

    }

    registerButtons() {

        const button =

            document.getElementById(
                "unlock-world"
            );

        if (!button) {

            return;

        }

        button.addEventListener(

            "click",

            () => {

                UnlockManager.unlock();

            }

        );

    }

    renderWorldList() {

        const container =

            document.getElementById(
                "world-list"
            );

        if (!container) {

            return;

        }

        container.innerHTML = "";

        WorldManager.getAll().forEach(

            (world, index) => {

                const item =

                    document.createElement(
                        "div"
                    );

                const button =

                    document.createElement(
                        "button"
                    );

                button.textContent =
                    world.name;

                button.addEventListener(

                    "click",

                    () => {

                        WorldManager.setActive(
                            index
                        );

                    }

                );

                item.innerHTML =

                    `
                    <p>Lv ${world.level}</p>
                    <p>★ ${world.rarity}</p>
                    `;

                item.appendChild(
                    button
                );

                container.appendChild(
                    item
                );

            }

        );

    }

    renderActiveWorld() {

        const world =

            WorldManager.getActive();

        if (!world) {

            return;

        }

        const name =

            document.getElementById(
                "world-name"
            );

        const level =

            document.getElementById(
                "world-level"
            );

        const rarity =

            document.getElementById(
                "world-rarity"
            );

        if (name) {

            name.textContent =
                world.name;

        }

        if (level) {

            level.textContent =
                world.level;

        }

        if (rarity) {

            rarity.textContent =
                world.rarity;

        }

    }

    renderUnlockCost() {

        const element =

            document.getElementById(
                "unlock-cost"
            );

        if (!element) {

            return;

        }

        element.textContent =

            Formatter.format(

                UnlockManager
                    .getUnlockCost()

            );

    }

    render() {

        this.renderActiveWorld();

        this.renderWorldList();

        this.renderUnlockCost();

    }

}

export default new WorldUI();