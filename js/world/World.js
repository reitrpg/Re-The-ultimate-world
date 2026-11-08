import BigNumber from "../number/BigNumber.js";
import ResourceManager from "../resource/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
import eventBus from "../core/eventBus.js";
import AchievementManager from "../achievements/Manager.js";
import { MAX_EXPONENT } from "../number/Constants.js";

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
        this.totalExperience = BigNumber.zero();
        this.newBirthMultiplier = BigNumber.one();
        this.baseProduction = BigNumber.one();
        this.uniqueEffect = { type: "none", name: "なし", multiplier: 1, resourceId: null };
        this.resourceMultipliers = { plant: 1.4, metal: 0.75, magic: 1 };
        this.resourceFeatures = {
            plant: "植物の大地",
            metal: "植物の大地",
            magic: "植物の大地"
        };
        this.newBirthCount = 0;
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
        const rawLevel = Number(this.level);
        const level = Number.isFinite(rawLevel)
            ? Math.max(1, Math.floor(rawLevel))
            : 1;

        // Closed-form equivalent of the previous ten-level groups:
        // 10×1 + 10×2 + ... + remainder×(group+1).
        // This avoids a loop proportional to the saved world level.
        const fullGroups = Math.floor(level / 10);
        const remaining = level % 10;

        return BigNumber.from(fullGroups)
            .multiply(fullGroups + 1)
            .multiply(5)
            .add(
                BigNumber.from(remaining).multiply(fullGroups + 1)
            );
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
        let rebirthMultiplier = BigNumber.from(this.newBirthMultiplier);

        // An invalid saved multiplier must never turn all production negative.
        if (!rebirthMultiplier.isFinite() || !rebirthMultiplier.greater(0)) {
            rebirthMultiplier = BigNumber.one();
            this.newBirthMultiplier = rebirthMultiplier;
        }

        const levelAdjustedProduction = this.baseProduction.add(
            this.getLevelProductionBonus()
        );

        const uniqueMultiplier =
            this.getAllResourceMultiplier() *
            this.getResourceUniqueMultiplier(id);

        return levelAdjustedProduction
            .multiply(this.getResourceMultiplier(id))
            .multiply(uniqueMultiplier)
            .multiply(rebirthMultiplier);
    }

    gainExperience(amount) {
        const gain = BigNumber.from(amount);

        // EXP is a non-negative resource. Reject stale/corrupt negative or
        // non-finite gains before they can poison the level-up condition.
        if (!gain.isFinite() || !gain.greater(0)) {
            return false;
        }

        if (!this.exp?.isFinite?.() || this.exp.less(0)) {
            this.exp = BigNumber.zero();
        }
        if (!this.totalExperience?.isFinite?.() || this.totalExperience.less(0)) {
            this.totalExperience = BigNumber.zero();
        }

        this.exp = this.exp.add(gain);
        this.totalExperience = this.totalExperience.add(gain);

        let leveledUp = false;
        let levelUpsThisTick = 0;
        const maxLevelUpsPerTick = 250;

        // Keep multi-level gains, but bound work per game tick. This prevents
        // a corrupt/astronomical EXP value from monopolizing the browser thread.
        while (levelUpsThisTick < maxLevelUpsPerTick) {
            const requiredExperience = this.getRequiredExperience();

            // A zero/invalid requirement would make the old while-loop infinite.
            if (
                !requiredExperience?.isFinite?.() ||
                !requiredExperience.greater(0) ||
                !this.exp.greaterOrEqual(requiredExperience)
            ) {
                break;
            }

            this.exp = this.exp.subtract(requiredExperience);
            this.level += 1;
            levelUpsThisTick += 1;
            leveledUp = true;
        }

        return leveledUp;
    }

    getRequiredExperience() {
        const rawLevel = Number(this.level);
        const level = Number.isFinite(rawLevel)
            ? Math.max(1, Math.floor(rawLevel))
            : 1;

        // Lv1〜10は従来の20%。Lv11〜20で段階的に通常値へ戻す。
        let requiredExperienceRate = 0.2;
        if (level > 10 && level < 20) {
            requiredExperienceRate += (level - 10) * 0.08;
        } else if (level >= 20) {
            requiredExperienceRate = 1;
        }

        if (level < 60) {
            return BigNumber.from(
                level * level * 100 * requiredExperienceRate
            );
        }

        // Compute the high-level exponential cost in logarithmic space.
        // Native Math.pow() overflowed to Infinity at extreme levels, which
        // BigNumber.from(Infinity) converted to zero and could freeze leveling.
        let decimalExponent =
            2 * Math.log10(level) +
            Math.log10(100 * requiredExperienceRate) +
            (level - 59) * Math.log10(1.08);

        if (level >= 70) {
            decimalExponent += (level - 69) * Math.log10(1.15);
        }

        if (!Number.isFinite(decimalExponent)) {
            return BigNumber.fromLayered(1, MAX_EXPONENT, 0);
        }

        const exponent = Math.floor(decimalExponent / 3);
        const mantissa = Math.pow(
            10,
            decimalExponent - exponent * 3
        );

        return BigNumber.fromLayered(mantissa, exponent, 0);
    }

    getPower(value, power) {
        const number = BigNumber.from(value);

        if (number.mantissa <= 0) {
            return BigNumber.zero();
        }

        // layer 0 は mantissa × 1000^exponent。指数部・仮数部の両方に累乗を適用する。
        if (number.layer === 0) {
            return BigNumber.fromLayered(
                Math.pow(number.mantissa, power),
                number.exponent * power,
                0
            );
        }

        // 上位層では指数部に累乗を適用して近似する。
        return BigNumber.fromLayered(
            Math.pow(number.mantissa, power),
            number.exponent * power,
            number.layer
        );
    }

    getNewBirthMultiplier() {
        // 基本倍率は累計EXPを等倍で使用し、増加分だけをアップグレード平均Lvで減衰させる。
        const effectiveExperience = BigNumber.from(this.totalExperience);
        const scaledExperience = BigNumber.one().add(
            effectiveExperience.divide(500000)
        );
        // 仮設定：累計EXPの平方根を新生倍率の基礎値にする。
        const baseMultiplier = this.getPower(scaledExperience, 0.5);

        const currentMultiplier = BigNumber.from(this.newBirthMultiplier);
        if (currentMultiplier.lessOrEqual(0)) {
            return baseMultiplier;
        }

        const rawMultiplier = baseMultiplier.divide(currentMultiplier);
        const trackedUpgradeIds = [
            "divine_revelation",
            "heavenly_blessing",
            "world_tree"
        ];
        const averageUpgradeLevel = trackedUpgradeIds.reduce(
            (sum, id) => sum + (UpgradeManager.get(id)?.level || 0),
            0
        ) / trackedUpgradeIds.length;

        let growthRate = 1;
        if (averageUpgradeLevel > 100 && averageUpgradeLevel <= 200) {
            growthRate = 0.5;
        } else if (averageUpgradeLevel > 200 && averageUpgradeLevel <= 300) {
            growthRate = 0.25;
        } else if (averageUpgradeLevel > 300) {
            growthRate = 0.1;
        }

        // 新生倍率そのものではなく、1倍を超える増加分にだけ減衰を適用する。
        return rawMultiplier.subtract(1).multiply(growthRate).add(1);
    }

    canNewBirth() {
        return this.getNewBirthMultiplier().greaterOrEqual(1.5);
    }

    performNewBirth() {
        if (!this.canNewBirth()) return false;

        const sacrifice = this.getNewBirthMultiplier();
        const currentMultiplier = BigNumber.from(this.newBirthMultiplier);

        this.newBirthMultiplier =
            !currentMultiplier.isFinite() || currentMultiplier.less(1)
                ? BigNumber.one().multiply(sacrifice)
                : currentMultiplier.multiply(sacrifice);
        this.newBirthCount += 1;

        // 新生成立時、無限強化のLvをそれぞれ10分の1にする（小数点以下切り捨て）。
        UpgradeManager.reduceInfiniteUpgradeLevels(0.1);

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
        )
            .multiply(UpgradeManager.getTotalMultiplier())
            .multiply(AchievementManager.getTotalMultiplier());

        let experienceGain = BigNumber.zero();

        RESOURCE_IDS.forEach(id => {
            const production = this
                .getResourceProduction(id)
                .multiply(globalMultiplier)
                .multiply(UpgradeManager.getResourceMultiplier(id));

            const amount = production.multiply(seconds);

            if (
                !production.isFinite() ||
                !production.greater(0) ||
                !amount.isFinite() ||
                !amount.greater(0)
            ) {
                const resource = ResourceManager.get(id);
                if (resource && (!production.isFinite() || production.less(0))) {
                    resource.production = BigNumber.zero();
                }
                return;
            }

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
            totalExperience: this.totalExperience.toJSON(),
            newBirthMultiplier: this.newBirthMultiplier.toJSON(),
            newBirthCount: this.newBirthCount,
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
        const savedLevel = Number(data.level);
        this.level = Number.isFinite(savedLevel)
            ? Math.max(1, Math.floor(savedLevel))
            : 1;
        this.exp = BigNumber.from(data.exp);
        if (!this.exp.isFinite() || this.exp.less(0)) {
            this.exp = BigNumber.zero();
        }

        this.totalExperience = BigNumber.from(
            data.totalExperience ?? data.totalExp ?? data.exp ?? 0
        );
        if (!this.totalExperience.isFinite() || this.totalExperience.less(0)) {
            this.totalExperience = BigNumber.zero();
        }

        this.newBirthMultiplier = BigNumber.from(
            data.newBirthMultiplier ?? data.rebirthMultiplier ?? 1
        );
        if (!this.newBirthMultiplier.isFinite() || this.newBirthMultiplier.less(1)) {
            this.newBirthMultiplier = BigNumber.one();
        }
        this.newBirthCount = Math.max(
            0,
            Number(data.newBirthCount ?? data.rebirthCount) || 0
        );
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
