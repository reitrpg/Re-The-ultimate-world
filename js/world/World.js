import BigNumber from "../number/BigNumber.js";
import ResourceManager from "../resource/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
import eventBus from "../core/eventBus.js";

const RESOURCE_IDS = ["plant", "metal", "magic"];

const FEATURE_DEFINITIONS = {
    "植物の大地": { plant: 1.4, metal: 0.75, magic: 1 },
    "豊かな鉱脈": { plant: 1, metal: 1.4, magic: 0.75 },
    "魔力の源泉": { plant: 0.75, metal: 1, magic: 1.4 }
};

function getFeatureByName(name) {
    return FEATURE_DEFINITIONS[name] || null;
}

function getFeatureByMultipliers(multipliers) {
    return Object.entries(FEATURE_DEFINITIONS).find(([, values]) =>
        RESOURCE_IDS.every(id => Number(multipliers?.[id]) === values[id])
    )?.[0] || null;
}

class World {
    constructor(seed = Date.now().toString()) {
        this.seed = String(seed);
        this.name = `World-${this.seed.slice(-4)}`;
        this.nameCustom = false;
        this.nameLanguage = "ja";
        this.luck = 1;
        this.rarity = this.generateRarity();
        this.level = 1;
        this.exp = BigNumber.zero();
        this.rebirthMultiplier = BigNumber.one();
        this.baseProduction = BigNumber.one();
        this.uniqueEffect = { type: "none", name: "なし", multiplier: 1, resourceId: null };
        this.resourceMultipliers = { plant: 1.4, metal: 0.75, magic: 1 };
        this.resourceFeatures = {
            plant: "植物の大地",
            metal: "植物の大地",
            magic: "植物の大地"
        };
        this.rebirthCount = 0;
    }

    generateRarity() {
        const value = Number(this.seed.slice(-2)) || 0;
        return Math.max(1, Math.floor(value / 10) + 1);
    }

    getLuck() {
        const value = Number(this.luck);
        return Number.isFinite(value) && value >= 1 ? value : 1;
    }

    getRarityMultiplier() {
        return this.rarity;
    }

    getLevelProductionBonus() {
        const level = Math.max(1, Math.floor(Number(this.level) || 1));

        let remaining = level;
        let multiplier = 1;
        let bonus = 0;

        while (remaining > 0) {
            const count = Math.min(10, remaining);
            bonus += multiplier * count;
            remaining -= count;
            multiplier += 1;
        }

        return BigNumber.from(bonus);
    }

    getUniqueEffectMultiplier() {
        const value = Number(this.uniqueEffect?.multiplier);
        return Number.isFinite(value) && value > 0 ? value : 1;
    }

    getUniqueEffectName() {
        return this.uniqueEffect?.name || "なし";
    }

    getUniqueEffectType() {
        return this.uniqueEffect?.type || "none";
    }

    getUniqueEffectResourceId() {
        return this.uniqueEffect?.resourceId || null;
    }

    getLuckMultiplier() {
        return this.getUniqueEffectType() === "luck"
            ? this.getUniqueEffectMultiplier()
            : 1;
    }

    getAllResourceMultiplier() {
        return this.getUniqueEffectType() === "allResource"
            ? this.getUniqueEffectMultiplier()
            : 1;
    }

    getEPConversionMultiplier() {
        return this.getUniqueEffectType() === "epConversion"
            ? this.getUniqueEffectMultiplier()
            : 1;
    }

    getResourceUniqueMultiplier(id) {
        if (this.getUniqueEffectType() !== "resource" ||
            this.getUniqueEffectResourceId() !== id) {
            return 1;
        }
        return this.getUniqueEffectMultiplier();
    }

    getResourceUniqueEffectMultiplier(id) {
        const type = this.getUniqueEffectType();

        if (type === "allResource") {
            return this.getUniqueEffectMultiplier();
        }

        if (type === "resource" && this.getUniqueEffectResourceId() === id) {
            return this.getUniqueEffectMultiplier();
        }

        return 1;
    }

    getTotalMultiplier() {
        return BigNumber.from(this.getUniqueEffectMultiplier());
    }

    getResourceMultiplier(id) {
        const value = Number(this.resourceMultipliers?.[id]);
        return Number.isFinite(value) && value > 0 ? value : 1;
    }

    getResourceFeatureName(id) {
        return this.resourceFeatures?.[id] || id;
    }

    getResourceProduction(id) {
        const levelAdjustedProduction = this.baseProduction.add(
            this.getLevelProductionBonus()
        );

        const uniqueMultiplier =
            this.getAllResourceMultiplier() *
            this.getResourceUniqueMultiplier(id);

        return levelAdjustedProduction
            .multiply(this.getResourceMultiplier(id))
            .multiply(uniqueMultiplier)
            .multiply(this.rebirthMultiplier);
    }

    gainExperience(amount) {
        this.exp = this.exp.add(amount);
        let leveledUp = false;

        while (this.exp.greaterOrEqual(this.getRequiredExperience())) {
            this.level += 1;
            this.exp = BigNumber.zero();
            leveledUp = true;
        }

        return leveledUp;
    }

    getRequiredExperience() {
        return BigNumber.from(this.level * this.level * 100);
    }

    getRebirthMultiplier() {
        return BigNumber.one().add(this.exp.divide(100));
    }

    canRebirth() {
        return this.getRebirthMultiplier().greaterOrEqual(2.5);
    }

    performRebirth() {
        if (!this.canRebirth()) return false;

        const sacrifice = this.getRebirthMultiplier();

        this.rebirthMultiplier = this.rebirthMultiplier.multiply(sacrifice);
        this.rebirthCount += 1;
        this.exp = BigNumber.zero();
        this.level = 1;
        this.baseProduction = BigNumber.one();

        return true;
    }

    levelUp() {
        this.level += 1;
        this.exp = BigNumber.zero();
    }

    update(deltaTime) {
        const seconds = Number(deltaTime);

        if (!Number.isFinite(seconds) || seconds <= 0) {
            return BigNumber.zero();
        }

        const globalMultiplier = BigNumber.from(
            ResearchManager.getTotalMultiplier()
        ).multiply(
            UpgradeManager.getTotalMultiplier()
        );

        let experienceGain = BigNumber.zero();

        RESOURCE_IDS.forEach(id => {
            const production = this
                .getResourceProduction(id)
                .multiply(globalMultiplier);

            const amount = production.multiply(seconds);

            if (amount.lessOrEqual(0)) return;

            if (ResourceManager.produce(id, amount, false)) {
                const resource = ResourceManager.get(id);

                if (resource) {
                    resource.production = production;
                }

                experienceGain = experienceGain.add(amount);
            }
        });

        if (experienceGain.greater(0)) {
            eventBus.emit("resource:update");
        }

        this.gainExperience(experienceGain);

        return experienceGain;
    }

    toJSON() {
        return {
            seed: this.seed,
            name: this.name,
            nameCustom: this.nameCustom === true,
            nameLanguage: this.nameLanguage,
            rarity: this.rarity,
            luck: this.getLuck(),
            level: this.level,
            exp: this.exp.toJSON(),
            rebirthMultiplier: this.rebirthMultiplier.toJSON(),
            rebirthCount: this.rebirthCount,
            baseProduction: this.baseProduction.toJSON(),
            uniqueEffect: { ...this.uniqueEffect },
            resourceMultipliers: { ...this.resourceMultipliers },
            resourceFeatures: { ...this.resourceFeatures }
        };
    }

    load(data) {
        if (!data || typeof data !== "object") return;

        this.seed = String(data.seed ?? Date.now());
        this.name = data.name || `World-${this.seed.slice(-4)}`;
        this.nameCustom = data.nameCustom === true;
        this.nameLanguage = ["ja", "en"].includes(data.nameLanguage) ? data.nameLanguage : "ja";
        this.rarity = Number(data.rarity) || 1;
        this.luck = Math.max(1, Number(data.luck) || 1);
        this.level = Math.max(1, Number(data.level) || 1);
        this.exp = BigNumber.from(data.exp);
        this.rebirthMultiplier = BigNumber.from(data.rebirthMultiplier ?? 1);
        this.rebirthCount = Math.max(0, Number(data.rebirthCount) || 0);
        this.baseProduction = BigNumber.from(data.baseProduction ?? 10);

        if (this.baseProduction.less(1)) {
            this.baseProduction = BigNumber.one();
        }

        if (data.uniqueEffect && typeof data.uniqueEffect === "object") {
            this.uniqueEffect = {
                type: data.uniqueEffect.type || "none",
                name: data.uniqueEffect.name || "なし",
                multiplier: Math.max(1, Number(data.uniqueEffect.multiplier) || 1),
                resourceId: data.uniqueEffect.resourceId || null
            };
        } else {
            this.uniqueEffect = {
                type: "none",
                name: "なし",
                multiplier: 1,
                resourceId: null
            };
        }

        const savedMultipliers = {
            plant: 1,
            metal: 1,
            magic: 1,
            ...(data.resourceMultipliers || {})
        };

        const savedFeatures = {
            plant: "",
            metal: "",
            magic: "",
            ...(data.resourceFeatures || {})
        };

        const featureName =
            Object.values(savedFeatures).find(name => getFeatureByName(name)) ||
            getFeatureByMultipliers(savedMultipliers) ||
            "植物の大地";

        const featureMultipliers =
            getFeatureByName(featureName) ||
            FEATURE_DEFINITIONS["植物の大地"];

        this.resourceMultipliers = { ...featureMultipliers };

        this.resourceFeatures = {
            plant: featureName,
            metal: featureName,
            magic: featureName
        };
    }
}

export default World;
