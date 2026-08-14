/**
 * World Creator
 * UI
 */

import eventBus from "../core/eventBus.js";

import WorldManager from "../world/Manager.js";
import ResourceManager from "../resource/Manager.js";
import EPManager from "../ep/Manager.js";
import SettingsManager from "../settings/Manager.js";

class UI {

    constructor() {

        this.initialized = false;

    }

    initialize() {

        if (this.initialized) {

            return;

        }

        this.initialized = true;

        this.registerEvents();

        this.update();

    }

    registerEvents() {

        const events = [

            "world:update",

            "world:active",

            "resource:update",

            "ep:update",

            "research:update",

            "upgrade:update"

        ];

        for (const event of events) {

            eventBus.on(

                event,

                () => {

                    this.update();

                }

            );

        }

    }

    getElement(id) {

        return document.getElementById(id);

    }

    format(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "0";

        }

        if (
            typeof value.toString ===
            "function"
        ) {

            return value.toString();

        }

        return String(value);

    }

    updateWorld() {

        const world =
            WorldManager.getActive();

        if (!world) {

            return;

        }

        const worldName =
            this.getElement(
                "world-name"
            );

        const worldLevel =
            this.getElement(
                "world-level"
            );

        const worldRarity =
            this.getElement(
                "world-rarity"
            );

        if (worldName) {

            worldName.textContent =
                world.name;

        }

        if (worldLevel) {

            worldLevel.textContent =
                world.level;

        }

        if (worldRarity) {

            worldRarity.textContent =
                world.rarity;

        }

    }

    updateResources() {

        const container =
            this.getElement(
                "resource-list"
            );

        if (!container) {

            return;

        }

        container.innerHTML = "";

        const resources =
            ResourceManager.getAll();

        for (

            const resource of

            Object.values(
                resources
            )

        ) {

            const row =
                document.createElement(
                    "div"
                );

            row.textContent =

                `${resource.name}: ${this.format(resource.amount)}`;

            container.appendChild(
                row
            );

        }

    }

    updateEP() {

        const element =
            this.getElement(
                "ep-value"
            );

        if (!element) {

            return;

        }

        element.textContent =
            this.format(
                EPManager.get()
            );

    }

    update() {

        this.updateWorld();

        this.updateResources();

        this.updateEP();

    }

}

export default new UI();