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

class UI {
    constructor() {
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        this.initialized = true;

        for (const module of INITIALIZE_MODULES) {
            try {
                module.initialize();
            } catch (error) {
                console.error(
                    "World Creator UI initialization failed:",
                    error
                );
            }
        }

        import("./StatisticsUI.js")
            .then(module => {
                try {
                    module.default.initialize();
                } catch (error) {
                    console.error(
                        "World Creator Statistics UI initialization failed:",
                        error
                    );
                }
            })
            .catch(error => {
                console.error(
                    "World Creator Statistics UI module load failed:",
                    error
                );
            });
    }
}

export default new UI();
