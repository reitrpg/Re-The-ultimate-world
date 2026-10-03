import eventBus from "../core/eventBus.js";
import BootProfiler from "../core/BootProfiler.js";

const MODULES = [
    ["TabUI", "./TabUI.js"],
    ["EPUI", "./EPUI.js"],
    ["ResourceUI", "./ResourceUI.js"],
    ["WorldUI", "./WorldUI.js"],
    ["UpgradeUI", "./UpgradeUI.js"],
    ["ConverterUI", "./ConverterUI.js"],
    ["RebirthUI", "./RebirthUI.js"],
    ["SettingsUI", "./SettingsUI.js"],
    ["DebugUI", "./DebugUI.js"],
    ["SaveUI", "./SaveUI.js"],
    ["NotificationUI", "./NotificationUI.js"],
    ["ErrorUI", "./ErrorUI.js"],
    ["StatisticsUI", "./StatisticsUI.js"],
    ["AchievementUI", "./AchievementUI.js"],
    ["AutomationUI", "./AutomationUI.js"]
];

class UI {
    constructor() {
        this.initialized = false;
        this.modules = new Map();
        this.errors = [];
    }

    async initialize() {
        if (this.initialized) return;

        this.initialized = true;

        BootProfiler.mark("UI.initialize start");

        const loadedModules = await Promise.all(
            MODULES.map(async ([name, path]) => {
                const start = performance.now();
                await this.initializeModule(name, path);

                return {
                    name,
                    elapsed: performance.now() - start
                };
            })
        );

        loadedModules.forEach(({ name, elapsed }) => {
            BootProfiler.mark(
                "UI module: " + name + " (" + elapsed.toFixed(2) + " ms)"
            );
        });

        eventBus.emit("ui:ready");
        BootProfiler.mark("UI.initialize end");
    }

    async initializeModule(name, path) {
        try {
            const module = await import(path);
            const instance = module.default ?? module;

            if (!instance || typeof instance.initialize !== "function") {
                throw new Error("UI module has no initialize(): " + name);
            }

            instance.initialize();
            this.modules.set(name, instance);
            eventBus.emit("ui:module:ready", { name });
        } catch (error) {
            this.errors.push({ name, error });
            console.error("World Creator UI module failed:", name, error);
            eventBus.emit("ui:module:error", { name, error });
        }
    }

    getModule(name) {
        return this.modules.get(name) || null;
    }

    getErrors() {
        return [...this.errors];
    }
}

export default new UI();
