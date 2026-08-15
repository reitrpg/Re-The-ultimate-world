/**
 * World Creator
 * Rebirth UI
 */

import RebirthManager from "../rebirth/Manager.js";

import Formatter from "../utils/Formatter.js";

import eventBus from "../core/eventBus.js";

class RebirthUI {

    constructor() {

        this.initialized = false;

    }

    initialize() {

        if (this.initialized) {

            return;

        }

        this.initialized = true;

        this.registerEvents();

        this.registerButton();

        this.render();

    }

    registerEvents() {

        eventBus.on(

            "rebirth:update",

            () => {

                this.render();

            }

        );

    }

    registerButton() {

        const button =

            document.getElementById(
                "rebirth-button"
            );

        if (!button) {

            return;

        }

        button.addEventListener(

            "click",

            () => {

                RebirthManager.rebirth();

            }

        );

    }

    render() {

        const count =

            document.getElementById(
                "rebirth-count"
            );

        const multiplier =

            document.getElementById(
                "rebirth-multiplier"
            );

        if (count) {

            count.textContent =

                RebirthManager.getCount();

        }

        if (multiplier) {

            multiplier.textContent =

                Formatter.format(

                    RebirthManager.getMultiplier()

                );

        }

    }

}

export default new RebirthUI();