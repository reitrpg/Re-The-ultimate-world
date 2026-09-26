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

const INITIALIZE_MODULES = [
    TabUI, EPUI, ResourceUI, WorldUI, ResearchUI, UpgradeUI,
    ConverterUI, RebirthUI, SettingsUI, DebugUI, SaveUI,
    NotificationUI, ErrorUI
];

const RENDER_MODULES = [
    EPUI, ResourceUI, WorldUI, ResearchUI, UpgradeUI,
    ConverterUI, RebirthUI, SettingsUI, DebugUI, ErrorUI
];

class UI {
    constructor() {
        this.initialized = false;
        this.renderQueued = false;
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;

        for (const module of INITIALIZE_MODULES) {
            try {
                module.initialize();
            } catch (error) {
                console.error("World Creator UI initialization failed:", error);
            }
        }

        this.registerEvents();
        this.scheduleUpdate();
    }

    registerEvents() {
        [
            "game:update",
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
            "ep:update",
            "load:success",
            "save:success"
        ].forEach(eventName => {
            eventBus.on(eventName, () => this.scheduleUpdate());
        });
    }

    scheduleUpdate() {
        if (this.renderQueued) return;
        this.renderQueued = true;

        const render = () => {
            this.renderQueued = false;
            this.update();
        };

        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(render);
        } else {
            setTimeout(render, 16);
        }
    }

    update() {
        for (const module of RENDER_MODULES) {
            try {
                if (typeof module.render === "function") {
                    module.render();
                } else if (typeof module.updateVisibility === "function") {
                    module.updateVisibility();
                }
            } catch (error) {
                console.error("World Creator UI render failed:", error);
            }
        }
    }
}

export default new UI();
