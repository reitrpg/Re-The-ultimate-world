import UpgradeManager from "../upgrades/Manager.js";
import EPManager from "../ep/Manager.js";
import Converter from "../converter/Converter.js";
import eventBus from "../core/eventBus.js";

class AutomationManager {
    constructor() {
        this.upgradeAutomation = new Map();
        this.upgradeSpendRates = new Map();
        this.converterAutomation = new Map();
        this.upgradeSpendRate = 0.10;
        this.converterRates = new Map();
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        this.initialized = true;

        UpgradeManager.getByType("infinite").forEach(upgrade => {
            this.upgradeAutomation.set(upgrade.id, false);
            this.upgradeSpendRates.set(upgrade.id, this.upgradeSpendRate);
        });

        Converter.getRecipes().forEach(recipe => {
            this.converterAutomation.set(recipe.id, false);
            if (!this.converterRates.has(recipe.resourceId)) {
                this.converterRates.set(recipe.resourceId, 0);
            }
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
            if (!this.upgradeSpendRates.has(upgrade.id)) {
                this.upgradeSpendRates.set(upgrade.id, this.upgradeSpendRate);
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

    setUpgradeSpendRate(id, rate) {
        if (!UpgradeManager.get(id) || UpgradeManager.get(id).type !== "infinite") {
            return false;
        }

        const value = Math.min(1, Math.max(0, Number(rate)));
        if (!Number.isFinite(value)) return false;

        this.upgradeSpendRates.set(id, value);
        eventBus.emit("automation:update");
        return true;
    }

    getUpgradeSpendRate(id) {
        if (id) {
            return this.upgradeSpendRates.get(id) ?? this.upgradeSpendRate;
        }
        return this.upgradeSpendRate;
    }

    setConverterRate(resourceId, rate) {
        if (!["plant", "metal", "magic"].includes(resourceId)) return false;
        const value = Math.min(1, Math.max(0, Number(rate)));
        if (!Number.isFinite(value)) return false;
        this.converterRates.set(resourceId, value);
        eventBus.emit("automation:update");
        return true;
    }

    getConverterRate(resourceId) {
        return this.converterRates.get(resourceId) ?? 0;
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

            const upgrade = UpgradeManager.get(id);
            if (!upgrade || !upgrade.isUnlocked()) continue;

            const currentEP = EPManager.get();
            const spendRate = this.getUpgradeSpendRate(id);
            const allowedCost = currentEP.multiply(spendRate);

            if (upgrade.getCost().greater(allowedCost)) continue;

            UpgradeManager.buy(id);
        }

        for (const [id, enabled] of this.converterAutomation) {
            if (!enabled) continue;

            const recipe = Converter.getRecipe(id);
            if (!recipe) continue;

            const rate = this.getConverterRate(recipe.resourceId);
            if (rate <= 0) continue;

            Converter.convertByRate(id, rate);
        }
    }

    reset() {
        this.upgradeAutomation.clear();
        this.upgradeSpendRates.clear();
        this.converterAutomation.clear();
        this.converterRates.clear();
        this.upgradeSpendRate = 0.10;

        UpgradeManager.getByType("infinite").forEach(upgrade => {
            this.upgradeAutomation.set(upgrade.id, false);
            this.upgradeSpendRates.set(upgrade.id, this.upgradeSpendRate);
        });

        Converter.getRecipes().forEach(recipe => {
            this.converterAutomation.set(recipe.id, false);
            this.converterRates.set(recipe.resourceId, 0);
        });

        eventBus.emit("automation:update");
    }

    toJSON() {
        return {
            upgradeAutomation: Object.fromEntries(this.upgradeAutomation),
            upgradeSpendRates: Object.fromEntries(this.upgradeSpendRates),
            upgradeSpendRate: this.upgradeSpendRate,
            converterAutomation: Object.fromEntries(this.converterAutomation),
            converterRates: Object.fromEntries(this.converterRates)
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

        const legacyRate = Number(data.upgradeSpendRate);
        if (Number.isFinite(legacyRate)) {
            this.upgradeSpendRate = Math.min(1, Math.max(0, legacyRate));
        }

        const savedSpendRates = data.upgradeSpendRates;
        if (savedSpendRates && typeof savedSpendRates === "object") {
            Object.entries(savedSpendRates).forEach(([id, rate]) => {
                if (UpgradeManager.get(id)?.type === "infinite") {
                    const value = Number(rate);
                    if (Number.isFinite(value)) {
                        this.upgradeSpendRates.set(
                            id,
                            Math.min(1, Math.max(0, value))
                        );
                    }
                }
            });
        } else {
            this.upgradeSpendRates.forEach((_, id) => {
                this.upgradeSpendRates.set(id, this.upgradeSpendRate);
            });
        }

        const savedRates = data.converterRates;
        if (savedRates && typeof savedRates === "object") {
            Object.entries(savedRates).forEach(([id, rate]) => {
                if (!["plant", "metal", "magic"].includes(id)) return;
                const value = Number(rate);
                if (Number.isFinite(value)) {
                    this.converterRates.set(
                        id,
                        Math.min(1, Math.max(0, value))
                    );
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
