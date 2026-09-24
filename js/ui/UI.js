/**
 * World Creator
 * UI Manager
 */

import eventBus from "../core/eventBus.js";
import TabUI from "./TabUI.js";
import EPUI from "./EPUI.js";
import ResourceUI from "./ResourceUI.js";
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
        if (this.initialized) return;

        this.initialized = true;

        TabUI.initialize();
        EPUI.initialize();
        ResourceUI.initialize();
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
        [
            "world:update",
            "resource:update",
            "research:update",
            "upgrade:update",
            "converter:update",
            "rebirth:update",
            "settings:update",
            "debug:update",
            "debug:reset",
            "error:update"
        ].forEach(event => {
            eventBus.on(event, () => this.update());
        });
    }

    update() {
        EPUI.render();
        ResourceUI.render();
        WorldUI.render();
        ResearchUI.render();
        UpgradeUI.render();
        ConverterUI.render();
        RebirthUI.render();
        SettingsUI.render();
        DebugUI.updateVisibility();
        ErrorUI.render();
    }
}

export default new UI();
