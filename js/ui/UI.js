/**
 * World Creator
 * UI Manager
 */

import eventBus from "../core/eventBus.js";

import WorldUI from "./WorldUI.js";
import ResearchUI from "./ResearchUI.js";
import UpgradeUI from "./UpgradeUI.js";
import ConverterUI from "./ConverterUI.js";
import RebirthUI from "./RebirthUI.js";
import SettingsUI from "./SettingsUI.js";
import DebugUI from "./DebugUI.js";
import SaveUI from "./SaveUI.js";
import NotificationUI from "./NotificationUI.js";
import ErrorUI from "./ErrorUI.js";

class UI {

    constructor() {

        this.initialized = false;

    }

    initialize() {

        if (this.initialized) {

            return;

        }

        this.initialized = true;

        WorldUI.initialize();

        ResearchUI.initialize();

        UpgradeUI.initialize();

        ConverterUI.initialize();

        RebirthUI.initialize();

        SettingsUI.initialize();

        DebugUI.initialize();

        SaveUI.initialize();

        NotificationUI.initialize();

        ErrorUI.initialize();

        this.registerEvents();

        this.update();

    }

    registerEvents() {

        const events = [

            "world:update",

            "resource:update",

            "research:update",

            "upgrade:update",

            "converter:update",

            "rebirth:update",

            "settings:update",

            "debug:update"

        ];

        events.forEach(

            event => {

                eventBus.on(

                    event,

                    () => {

                        this.update();

                    }

                );

            }

        );

    }

    update() {

        WorldUI.render();

        ResearchUI.render();

        UpgradeUI.render();

        ConverterUI.render();

        RebirthUI.render();

        ErrorUI.render();

    }

}

export default new UI();