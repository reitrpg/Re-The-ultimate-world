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

       