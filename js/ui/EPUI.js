/**
 * World Creator
 * EP UI
 */

import EPManager from "../ep/Manager.js";
import Formatter from "../utils/Formatter.js";
import eventBus from "../core/eventBus.js";

class EPUI {

    constructor() {

        this.initialized = false;

    }

    initialize() {

        if (this.initialized) {

            return;

        }

        this.initialized = true;

        this.registerEvents();

        this.render();

    }

    registerEvents() {

        eventBus.on(

            "ep:update",

            () => {

                this.render();

            }

        );

    }

    render() {

        const element =

            document.getElementById(
                "ep-value"
            );

        if (!element) {

            return;

        }

        element.textContent =

            Formatter.format(

                EPManager.get()

            );

    }

}

export default new EPUI();