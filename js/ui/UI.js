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

        const modules = [
            TabUI,
            EPUI,
            ResourceUI,
            WorldUI,
            ResearchUI,
            UpgradeUI,
            ConverterUI,
            RebirthUI,
            SettingsUI,
            DebugUI,
            SaveUI,
            NotificationUI,
            ErrorUI
        ];

        // A single broken optional UI module must not kill the entire UI.
        modules.forEach(module => {
            try {
                module.initialize();
            } catch (error) {
                console.error("World Creator UI initialization failed:", error);
                queueMicrotask(() => { throw error; });
            }
        });

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
            "error:update",
            "ep:update"
        ].forEach(event => {
            eventBus.on(event, () => this.update());
        });
    }

    update() {
        const modules = [
            EPUI,
            ResourceUI,
            WorldUI,
            ResearchUI,
            UpgradeUI,
            ConverterUI,
            RebirthUI,
            SettingsUI,
            DebugUI,
            ErrorUI
        ];

        modules.forEach(module => {
            try {
                if (typeof module.render === "function") {
                    module.render();
                } else if (typeof module.updateVisibility === "function") {
                    module.updateVisibility();
                }
            } catch (error) {
                console.error("World Creator UI render failed:", error);
                queueMicrotask(() => { throw error; });
            }
        });
    }
}

export default new UI();
