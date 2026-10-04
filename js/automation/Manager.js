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
        if (!this.converterAutomation.has(id)) this.converterAutomation.set(id, false);
        if (!this.converterRates.has(resourceId)) this.converterRates.set(resourceId, 0);
        if (!this.converterModes.has(id)) {
            this.converterModes.set(id, {
                mode: MODES.RATIO,
                threshold: 100,
                multiplier: 2,
                formula: "resource",
                formulaThreshold: 0,
                seconds: 1
            });
        }
        if (!this.converterTimers.has(id)) this.converterTimers.set(id, 0);
    }

    syncUpgrades() {
        UpgradeManager.getByType("infinite").forEach(upgrade => {
            if (!this.upgradeAutomation.has(upgrade.id)) this.upgradeAutomation.set(upgrade.id, false);
            if (!this.upgradeSpendRates.has(upgrade.id)) this.upgradeSpendRates.set(upgrade.id, this.upgradeSpendRate);
        });
    }

    syncConverters() {
        Converter.getRecipes().forEach(recipe => this.initializeConverter(recipe.id, recipe.resourceId));
    }

    setUpgradeSpendRate(id, rate) {
        if (!UpgradeManager.get(id) || UpgradeManager.get(id).type !== "infinite") return false;
        const value = Math.min(1, Math.max(0, Number(rate)));
        if (!Number.isFinite(value)) return false;
        this.upgradeSpendRates.set(id, value);
        eventBus.emit("automation:update");
        return true;
    }

    getUpgradeSpendRate(id) {
        return id ? (this.upgradeSpendRates.get(id) ?? this.upgradeSpendRate) : this.upgradeSpendRate;
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
        this.converterModes.get(id).mode = mode;
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
        if (!config || !Number.isFinite(number) || number <= 0) return false;
        config.threshold = number;
        eventBus.emit("automation:update");
        return true;
    }

    getConverterThreshold(id) {
        return this.converterModes.get(id)?.threshold ?? 100;
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
        return this.converterModes.get(id)?.formula ?? "resource";
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
        if (!config || !Number.isFinite(number) || number < 0) return false;
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

    getFormulaVariables(resourceId) {
        return {
            plant: ResourceManager.get("plant")?.amount ?? BigNumber.zero(),
            metal: ResourceManager.get("metal")?.amount ?? BigNumber.zero(),
            magic: ResourceManager.get("magic")?.amount ?? BigNumber.zero(),
            EP: EPManager.get(),
            ep: EPManager.get(),
            resource: ResourceManager.get(resourceId)?.amount ?? BigNumber.zero(),
            totalMaterials: StatisticsManager.getTotalMaterials?.() ?? BigNumber.zero()
        };
    }

    runConverter(id, deltaTime) {
        const recipe = Converter.getRecipe(id);
        const config = this.converterModes.get(id);
        if (!recipe || !config) return;

        if (config.mode === MODES.RATIO) {
            const rate = this.getConverterRate(recipe.resourceId);
            if (rate > 0) Converter.convertByRate(id, rate);
            return;
        }

        if (config.mode === MODES.PROPORTIONAL) {
            let threshold = BigNumber.from(config.threshold);
            const multiplier = Number(config.multiplier);
            if (!Number.isFinite(multiplier) || multiplier <= 0 || threshold.lessOrEqual(0)) return;

            let guard = 0;
            while (this.getFormulaVariables(recipe.resourceId).resource.greater(threshold) && guard < 100) {
                const amount = threshold.multiply(multiplier);
                if (Converter.convertByAmount(id, amount) <= 0) break;
                config.threshold = threshold.multiply(multiplier).toNumber();
                if (!Number.isFinite(config.threshold) || config.threshold <= 0) break;
                threshold = BigNumber.from(config.threshold);
                guard++;
            }
            return;
        }

        if (config.mode === MODES.FORMULA) {
            try {
                const result = FormulaEvaluator.evaluate(
                    config.formula,
                    this.getFormulaVariables(recipe.resourceId)
                );

                const resource = ResourceManager
                    .get(recipe.resourceId)
                    ?.amount ?? BigNumber.zero();

                // 計算式の結果を指定値とし、変換対象リソースが
                // その指定値を超えた場合に発動する。
                if (resource.greater(result)) {
                    Converter.convert(id);
                }
            } catch (_) {}
            return;
        }

        if (config.mode === MODES.TIME) {
            // 0秒は「待ち時間なし」なので、ゲーム更新ごとに1回変換する。
            if (config.seconds <= 0) {
                this.converterTimers.set(id, 0);
                Converter.convert(id);
                return;
            }

            const timer = (this.converterTimers.get(id) ?? 0) + Math.max(0, Number(deltaTime) || 0);
            if (timer >= config.seconds) {
                this.converterTimers.set(id, 0);
                Converter.convert(id);
            } else {
                this.converterTimers.set(id, timer);
            }
        }
    }

    update(deltaTime = 0) {
        for (const [id, enabled] of this.upgradeAutomation) {
            if (!enabled) continue;
            const upgrade = UpgradeManager.get(id);
            if (!upgrade || !upgrade.isUnlocked()) continue;
            const currentEP = EPManager.get();
            const allowedCost = currentEP.multiply(this.getUpgradeSpendRate(id));
            if (!upgrade.getCost().greater(allowedCost)) UpgradeManager.buy(id);
        }

        for (const [id, enabled] of this.converterAutomation) {
            if (enabled) this.runConverter(id, deltaTime);
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

        Converter.getRecipes().forEach(recipe => this.initializeConverter(recipe.id, recipe.resourceId));
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

        if (data.upgradeAutomation && typeof data.upgradeAutomation === "object") {
            Object.entries(data.upgradeAutomation).forEach(([id, enabled]) => {
                if (UpgradeManager.get(id)?.type === "infinite") this.upgradeAutomation.set(id, Boolean(enabled));
            });
        }

        const legacyRate = Number(data.upgradeSpendRate);
        if (Number.isFinite(legacyRate)) this.upgradeSpendRate = Math.min(1, Math.max(0, legacyRate));

        if (data.upgradeSpendRates && typeof data.upgradeSpendRates === "object") {
            Object.entries(data.upgradeSpendRates).forEach(([id, rate]) => {
                if (UpgradeManager.get(id)?.type !== "infinite") return;
                const value = Number(rate);
                if (Number.isFinite(value)) this.upgradeSpendRates.set(id, Math.min(1, Math.max(0, value)));
            });
        } else {
            this.upgradeSpendRates.forEach((_, id) => this.upgradeSpendRates.set(id, this.upgradeSpendRate));
        }

        if (data.converterRates && typeof data.converterRates === "object") {
            Object.entries(data.converterRates).forEach(([id, rate]) => {
                if (!["plant", "metal", "magic"].includes(id)) return;
                const value = Number(rate);
                if (Number.isFinite(value)) this.converterRates.set(id, Math.min(1, Math.max(0, value)));
            });
        }

        if (data.converterModes && typeof data.converterModes === "object") {
            Object.entries(data.converterModes).forEach(([id, saved]) => {
                const config = this.converterModes.get(id);
                if (!config || !saved || typeof saved !== "object") return;
                if (Object.values(MODES).includes(saved.mode)) config.mode = saved.mode;
                if (Number.isFinite(Number(saved.threshold)) && Number(saved.threshold) > 0) config.threshold = Number(saved.threshold);
                if (Number.isFinite(Number(saved.multiplier)) && Number(saved.multiplier) > 0) config.multiplier = Number(saved.multiplier);
                if (typeof saved.formula === "string") config.formula = saved.formula;
                if (Number.isFinite(Number(saved.formulaThreshold))) config.formulaThreshold = Number(saved.formulaThreshold);
                if (Number.isFinite(Number(saved.seconds)) && Number(saved.seconds) >= 0) config.seconds = Number(saved.seconds);
            });
        }

        if (data.converterAutomation && typeof data.converterAutomation === "object") {
            Object.entries(data.converterAutomation).forEach(([id, enabled]) => {
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
