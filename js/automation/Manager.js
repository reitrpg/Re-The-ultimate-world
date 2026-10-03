import UpgradeManager from "../upgrades/Manager.js";
import Converter from "../converter/Converter.js";
import eventBus from "../core/eventBus.js";

class AutomationManager {
    constructor() {
        this.upgradeAutomation = new Map();
        this.converterAutomation = new Map();
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        this.initialized = true;

        UpgradeManager.getByType("infinite").forEach(upgrade => {
            this.upgradeAutomation.set(upgrade.id, false);
        });

        Converter.getRecipes().forEach(recipe => {
            this.converterAutomation.set(recipe.id, false);
        });

        eventBus.on("game:update", () => this.update());
        eventBus.on("upgrade:update", () => this.syncUpgrades());
        eventBus.on("converter:update", () => this.syncConverters());
    }

    syncUpgrades() {
        UpgradeManager.getByType("infinite").forEach(upgrade => {
            if (!this.upgradeAutomation.has(upgrade.id)) {
                this.upgradeAutomation.set(upgrade.id, false);
            }
        });
    }

    syncConverters() {
        Converter.getRecipes().forEach(recipe => {
            if (!this.converterAutomation.has(recipe.id)) {
                this.converterAutomation.set(recipe.id, false);
            }
        });
    }

    setUpgradeAutomation(id, enabled) {
        if (!UpgradeManager.get(id) || UpgradeManager.get(id).type !== "infinite") {
            return false;
        }

        this.upgradeAutomation.set(id, Boolean(enabled));
        eventBus.emit("automation:update");
        return true;
    }

    setConverterAutomation(id, enabled) {
        if (!Converter.getRecipe(id)) return false;

        this.converterAutomation.set(id, Boolean(enabled));
        eventBus.emit("automation:update");
        return true;
    }

    isUpgradeAutomationEnabled(id) {
        return this.upgradeAutomation.get(id) === true;
    }

    isConverterAutomationEnabled(id) {
        return this.converterAutomation.get(id) === true;
    }

    update() {
        for (const [id, enabled] of this.upgradeAutomation) {
            if (!enabled) continue;
            UpgradeManager.buy(id);
        }

        for (const [id, enabled] of this.converterAutomation) {
            if (!enabled) continue;
            Converter.convertAll(id);
        }
    }

    reset() {
        this.upgradeAutomation.clear();
        this.converterAutomation.clear();
        this.initialized = false;
        this.initialize();
        eventBus.emit("automation:update");
    }

    toJSON() {
        return {
            upgradeAutomation: Object.fromEntries(this.upgradeAutomation),
            converterAutomation: Object.fromEntries(this.converterAutomation)
        };
    }

    load(data) {
        this.reset();

        if (!data || typeof data !== "object") return;

        const upgrades = data.upgradeAutomation;
        if (upgrades && typeof upgrades === "object") {
            Object.entries(upgrades).forEach(([id, enabled]) => {
                if (UpgradeManager.get(id)?.type === "infinite") {
                    this.upgradeAutomation.set(id, Boolean(enabled));
                }
            });
        }

        const converters = data.converterAutomation;
        if (converters && typeof converters === "object") {
            Object.entries(converters).forEach(([id, enabled]) => {
                if (Converter.getRecipe(id)) {
                    this.converterAutomation.set(id, Boolean(enabled));
                }
            });
        }

        eventBus.emit("automation:update");
    }
}

export default new AutomationManager();
