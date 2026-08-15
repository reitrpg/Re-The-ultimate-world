/**
 * World Creator
 * Rebirth UI
 */

import eventBus from "../core/eventBus.js";

import RebirthManager from "../rebirth/Manager.js";

class RebirthUI {

    constructor() {

        this.initialized = false;

    }

    initialize() {

        if (this.initialized) {

            return;

        }

        this.initialized = true;

        eventBus.on(

            "rebirth:update",

            () => {

                this.render();

            }

        );

        eventBus.on(

            "ep:update",

            () => {

                this.render();

            }

        );

        this.registerEvents();

        this.render();

    }

    registerEvents() {

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

        const multiplier =

            document.getElementById(

                "rebirth-multiplier"

            );

        const count =

            document.getElementById(

                "rebirth-count"

            );

        const button =

            document.getElementById(

                "rebirth-button"

            );

        if (multiplier) {

            multiplier.textContent =

                RebirthManager
                    .getMultiplier()
                    .toString();

        }

        if (count) {

            count.textContent =

                RebirthManager
                    .getCount();

        }

        if (button) {

            button.disabled =

                !RebirthManager
                    .canRebirth();

        }

    }

}

export default new RebirthUI();