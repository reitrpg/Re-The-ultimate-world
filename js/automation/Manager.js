import UpgradeManager from "../upgrades/Manager.js";
import EPManager from "../ep/Manager.js";
import Converter from "../converter/Converter.js";
import ResourceManager from "../resource/Manager.js";
import StatisticsManager from "../statistics/Manager.js";
import BigNumber from "../number/BigNumber.js";
import FormulaEvaluator from "../automation/FormulaEvaluator.js";
import eventBus from "../core/eventBus.js";

const MODES = {
    RATIO: "ratio",
    PROPORTIONAL: "proportional",
    FORMULA: "formula",
    TIME: "time"
};

class AutomationManager {
    constructor() {
        this.upgradeAutomation = new Map();
        this.upgradeSpendRates = new Map();
        this.converterAutomation = new Map();
        this.upgradeSpendRate = 0.10;
        this.converterRates = new Map();
        this.converterModes = new Map();
        this.converterTimers = new Map();
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
            this.initializeConverter(recipe.id, recipe.resourceId);
        });

        eventBus.on("game:update", deltaTime => this.update(deltaTime));
        eventBus.on("upgrade:update", () => this.syncUpgrades());
        eventBus.on("converter:update", () => this.syncConverters());
    }

    initializeConverter(id, resourceId) {
        if (!this.converterAutomation.has(id)) {
            this.converterAutomation.set(id, false);
        }
        if (!this.converterRates.has(resourceId)) {
            this.converterRates.set(resourceId, 0);
        }
        if (!this.converterModes.has(id)) {
            this.converterModes.set(id, {
                mode: MODES.RATIO,
                threshold: 0,
                multiplier: 2,
                formula: "resource",
                formulaThreshold: 0,
                seconds: 1
            });
        }
        if (!this.converterTimers.has(id)) {
            this.converterTimers.set(id, 0);
        }
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
            this.initializeConverter(recipe.id, recipe.resourceId);
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
        if (id) return this.upgradeSpendRates.get(id) ?? this.upgradeSpendRate;
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

    setConverterMode(id, mode) {
        if (!this.converterModes.has(id) || !Object.values(MODES).includes(mode)) return false;
        const config = this.converterModes.get(id);
        config.mode = mode;
        this.converterTimers.set(id, 0);
        eventBus.emit("automation:update");
        return true;
    }

    getConverterMode(id) {
        return this.converterModes.get(id)?.mode ?? MODES.RATIO;
    }

    setConverterThreshold(id, value) {
        const config = this.converterModes.get(id);
        const number = Number(value);
        if (!config || !Number.isFinite(number) || number < 0) return false;
        config.threshold = number;
        eventBus.emit("automation:update");
        return true;
    }

    getConverterThreshold(id) {
        return this.converterModes.get(id)?.threshold ?? 0;
    }

    setConverterMultiplier(id, value) {
        const config = this.converterModes.get(id);
        const number = Number(value);
        if (!config || !Number.isFinite(number) || number <= 0) return false;
        config.multiplier = number;
        eventBus.emit("automation:update");
        return true;
    }

    getConverterMultiplier(id) {
        return this.converterModes.get(id)?.multiplier ?? 2;
    }

    setConverterFormula(id, formula) {
        const config = this.converterModes.get(id);
        if (!config) return false;
        config.formula = String(formula ?? "").trim();
        eventBus.emit("automation:update");
        return true;
    }

    getConverterFormula(id) {
        return this.converterModes.get(id)?.formula ?? "";
    }

    setConverterFormulaThreshold(id, value) {
        const config = this.converterModes.get(id);
        const number = Number(value);
        if (!config || !Number.isFinite(number)) return false;
        config.formulaThreshold = number;
        eventBus.emit("automation:update");
        return true;
    }

    getConverterFormulaThreshold(id) {
        return this.converterModes.get(id)?.formulaThreshold ?? 0;
    }

    setConverterSeconds(id, value) {
        const config = this.converterModes.get(id);
        const number = Number(value);
        if (!config || !Number.isFinite(number) || number <= 0) return false;
        config.seconds = number;
        this.converterTimers.set(id, 0);
        eventBus.emit("automation:update");
        return true;
    }

    getConverterSeconds(id) {
        return this.converterModes.get(id)?.seconds ?? 1;
    }

    setUpgradeAutomation(id, enabled) {
        if (!UpgradeManager.get(id) || UpgradeManager.get(id).type !== "infinite") return false;
        this.upgradeAutomation.set(id, Boolean(enabled));
        eventBus.emit("automation:update");
        return true;
    }

    setConverterAutomation(id, enabled) {
        if (!Converter.getRecipe(id)) return false;
        this.converterAutomation.set(id, Boolean(enabled));
        if (!enabled) this.converterTimers.set(id, 0);
        eventBus.emit("automation:update");
        return true;
    }

    isUpgradeAutomationEnabled(id) {
        return this.upgradeAutomation.get(id) === true;
    }

    isConverterAutomationEnabled(id) {
        return this.converterAutomation.get(id) === true;
    }

    getResourceValue(resourceId) {
        return ResourceManager.get(resourceId)?.amount ?? BigNumber.zero();
    }

    getFormulaVariables(resourceId) {
        return {
            plant: this.getResourceValue("plant"),
            metal: this.getResourceValue("metal"),
            magic: this.getResourceValue("magic"),
            EP: EPManager.get(),
            ep: EPManager.get(),
            resource: this.getResourceValue(resourceId),
            totalMaterials: StatisticsManager.getTotalMaterials?.() ?? BigNumber.zero()
        };
    }

    runConverter(id, mode, deltaTime) {
        const recipe = Converter.getRecipe(id);
        const config = this.converterModes.get(id);
        if (!recipe || !config) return;

        if (mode === MODES.RATIO) {
            const rate = this.getConverterRate(recipe.resourceId);
            if (rate > 0) Converter.convertByRate(id, rate);
            return;
        }

        if (mode === MODES.PROPORTIONAL) {
            const resource = this.getResourceValue(recipe.resourceId);
            let threshold = BigNumber.from(config.threshold);

            if (threshold.lessOrEqual(0)) return;

            let guard = 0;
            while (resource.greater(threshold) && guard < 100) {
                const amount = threshold.multiply(config.multiplier);
                if (Converter.convertByAmount(id, amount) <= 0) break;
                config.threshold = threshold.multiply(config.multiplier).toNumber();
                threshold = BigNumber.from(config.threshold);
                guard++;
            }
            return;
        }

        if (mode === MODES.FORMULA) {
            try {
                const result = FormulaEvaluator.evaluate(
                    config.formula,
                    this.getFormulaVariables(recipe.resourceId)
                );
                if (result.greater(BigNumber.from(config.formulaThreshold))) {
                    Converter.convert(id);
                }
            } catch (_) {
                // Invalid formulas simply do not trigger automation.
            }
            return;
        }

        if (mode === MODES.TIME) {
            this.converterTimers.set(
                id,
                (this.converterTimers.get(id) ?? 0) + Math.max(0, deltaTime)
            );

            if (this.converterTimers.get(id) >= config.seconds) {
                this.converterTimers.set(id, 0);
                Converter.convert(id);
            }
        }
    }

    update(deltaTime = 0) {
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
            this.runConverter(id, this.getConverterMode(id), deltaTime);
        }
    }

    reset() {
        this.upgradeAutomation.clear();
        this.upgradeSpendRates.clear();
        this.converterAutomation.clear();
        this.converterRates.clear();
        this.converterModes.clear();
        this.converterTimers.clear();
        this.upgradeSpendRate = 0.10;

        UpgradeManager.getByType("infinite").forEach(upgrade => {
            this.upgradeAutomation.set(upgrade.id, false);
            this.upgradeSpendRates.set(upgrade.id, this.upgradeSpendRate);
        });

        Converter.getRecipes().forEach(recipe => {
            this.initializeConverter(recipe.id, recipe.resourceId);
        });

        eventBus.emit("automation:update");
    }

    toJSON() {
        return {
            upgradeAutomation: Object.fromEntries(this.upgradeAutomation),
            upgradeSpendRates: Object.fromEntries(this.upgradeSpendRates),
            upgradeSpendRate: this.upgradeSpendRate,
            converterAutomation: Object.fromEntries(this.converterAutomation),
            converterRates: Object.fromEntries(this.converterRates),
            converterModes: Object.fromEntries(this.converterModes)
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
                        this.upgradeSpendRates.set(id, Math.min(1, Math.max(0, value)));
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
                    this.converterRates.set(id, Math.min(1, Math.max(0, value)));
                }
            });
        }

        const savedModes = data.converterModes;
        if (savedModes && typeof savedModes === "object") {
            Object.entries(savedModes).forEach(([id, saved]) => {
                if (!this.converterModes.has(id) || !saved || typeof saved !== "object") return;
                const config = this.converterModes.get(id);
                if (Object.values(MODES).includes(saved.mode)) config.mode = saved.mode;
                if (Number.isFinite(Number(saved.threshold)) && Number(saved.threshold) >= 0) config.threshold = Number(saved.threshold);
                if (Number.isFinite(Number(saved.multiplier)) && Number(saved.multiplier) > 0) config.multiplier = Number(saved.multiplier);
                if (typeof saved.formula === "string") config.formula = saved.formula;
                if (Number.isFinite(Number(saved.formulaThreshold))) config.formulaThreshold = Number(saved.formulaThreshold);
                if (Number.isFinite(Number(saved.seconds)) && Number(saved.seconds) > 0) config.seconds = Number(saved.seconds);
            });
        }

        const converters = data.converterAutomation;
        if (converters && typeof converters === "object") {
            Object.entries(converters).forEach(([id, enabled]) => {
                if (Converter.getRecipe(id)) this.converterAutomation.set(id, Boolean(enabled));
            });
        }

        eventBus.emit("automation:update");
    }

    getModes() {
        return { ...MODES };
    }
}

export default new AutomationManager();
