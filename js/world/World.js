import BigNumber from "../number/BigNumber.js";
import ResourceManager from "../resource/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";

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
        this.rarity = this.generateRarity();
        this.level = 1;
        this.exp = BigNumber.zero();
        this.rebirthMultiplier = BigNumber.one();
        this.baseProduction = BigNumber.one();
        this.uniqueEffect = 1;
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

    getLevelMultiplier() {
        return Math.max(1, Math.pow(2, this.level - 1));
    }

    getRarityMultiplier() {
        return this.rarity;
    }

    getTotalMultiplier() {
        return BigNumber.one();
    }

    getResourceMultiplier(id) {
        const value = Number(this.resourceMultipliers?.[id]);
        return Number.isFinite(value) && value > 0 ? value : 1;
    }

    getResourceFeatureName(id) {
        return this.resourceFeatures?.[id] || id;
    }

    getResourceProduction(id) {
        return BigNumber.one()
            .multiply(this.getLevelMultiplier())
            .multiply(this.getResourceMultiplier(id))
            .multiply(this.rebirthMultiplier);
    }

    gainExperience(amount) {
        this.exp = this.exp.add(amount);
        let leveledUp = false;

        while (this.exp.greaterOrEqual(this.getRequiredExperience())) {
            this.level += 1;
            this.exp = BigNumber.zero();
            this.baseProduction = this.baseProduction.multiply(2);
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
        this.baseProduction = this.baseProduction.multiply(2);
    }

    update(deltaTime) {
        const globalMultiplier =
            ResearchManager.getTotalMultiplier() *
            UpgradeManager.getTotalMultiplier();

        let experienceGain = BigNumber.zero();

        RESOURCE_IDS.forEach(id => {
            const amount =
                this.getResourceProduction(id)
                    .multiply(globalMultiplier)
                    .multiply(deltaTime);

            if (ResourceManager.produce(id, amount)) {
                experienceGain = experienceGain.add(amount);
            }
        });

        this.gainExperience(experienceGain);
    }

    toJSON() {
        return {
            seed: this.seed,
            name: this.name,
            rarity: this.rarity,
            level: this.level,
            exp: this.exp.toJSON(),
            rebirthMultiplier: this.rebirthMultiplier.toJSON(),
            rebirthCount: this.rebirthCount,
            baseProduction: this.baseProduction.toJSON(),
            uniqueEffect: this.uniqueEffect,
            resourceMultipliers: { ...this.resourceMultipliers },
            resourceFeatures: { ...this.resourceFeatures }
        };
    }

    load(data) {
        if (!data || typeof data !== "object") return;

        this.seed = String(data.seed ?? Date.now());
        this.name = data.name || `World-${this.seed.slice(-4)}`;
        this.rarity = Number(data.rarity) || 1;
        this.level = Math.max(1, Number(data.level) || 1);
        this.exp = BigNumber.from(data.exp || 0);
        this.rebirthMultiplier = BigNumber.from(data.rebirthMultiplier || 1);
        this.rebirthCount = Math.max(0, Number(data.rebirthCount) || 0);
        this.baseProduction = BigNumber.from(data.baseProduction || 1);
        if (this.baseProduction.lessOrEqual(0)) {
            this.baseProduction = BigNumber.one();
        }

        this.uniqueEffect =
            Number.isFinite(Number(data.uniqueEffect))
                ? Number(data.uniqueEffect)
                : 1;

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
            getFeatureByName(featureName) || FEATURE_DEFINITIONS["植物の大地"];

        this.resourceMultipliers = { ...featureMultipliers };
        this.resourceFeatures = {
            plant: featureName,
            metal: featureName,
            magic: featureName
        };
    }
}

export default World;