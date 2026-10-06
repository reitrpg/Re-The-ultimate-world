/**
 * World Creator
 * Upgrade
 */

import EPManager from "../ep/Manager.js";
import ResourceManager from "../resource/Manager.js";
import BigNumber from "../number/BigNumber.js";

class Upgrade {
    constructor(
        id = "",
        name = "",
        multiplier = 1,
        cost = 0,
        type = "infinite",
        maxLevel = null,
        effectText = "",
        targetResource = null,
        costResource = null,
        prerequisiteId = null
    ) {
        this.id = id;
        this.name = name;
        this.level = 0;
        this.multiplier = multiplier;
        this.effectText = String(effectText || "");
        this.targetResource = ["plant", "metal", "magic"].includes(targetResource) ? targetResource : null;
        this.costResource = ["plant", "metal", "magic"].includes(costResource) ? costResource : null;
        this.prerequisiteId = prerequisiteId || null;
        this.baseCost = BigNumber.from(cost);
        this.type = type === "limited" ? "limited" : "infinite";
        this.unlocked = true;
        this.maxLevel =
            maxLevel !== null &&
            maxLevel !== undefined &&
            Number.isFinite(Number(maxLevel))
                ? Math.max(0, Math.floor(Number(maxLevel)))
                : null;
    }

    getCost() {
        if (this.id === "creator_will") {
            const decimalExponent = this.level + 3;
            const exponent = Math.floor(decimalExponent / 3);
            const remainder = decimalExponent % 3;
            const mantissa = Math.pow(10, remainder);
            return BigNumber.fromLayered(mantissa, exponent, 0);
        }

        if (this.type === "infinite") {
            let levelFactor;

            if (this.level <= 10) {
                levelFactor = 1 + (1.5 * Math.pow(this.level, 2));
            } else {
                let coefficient;

                if (this.level >= 100) {
                    coefficient = 13;
                } else if (this.level >= 51) {
                    coefficient = 10;
                } else if (this.level >= 41) {
                    coefficient = 8.5;
                } else if (this.level >= 31) {
                    coefficient = 7;
                } else if (this.level >= 21) {
                    coefficient = 5;
                } else {
                    coefficient = 3;
                }

                levelFactor = 1 + (coefficient * Math.pow(this.level, 3));
            }

            return this.baseCost.multiply(levelFactor);
        }

        return this.baseCost;
    }

    getCostResource() {
        return this.costResource;
    }

    getPrerequisiteId() {
        return this.prerequisiteId;
    }

    getUnlockConditionText() {
        if (!this.prerequisiteId) {
            return "";
        }

        const names = {
            divine_revelation: "神託 Lv1",
            heavenly_blessing: "天恵 Lv1",
            world_tree: "世界樹の加護 Lv1"
        };

        return names[this.prerequisiteId] || "前提強化 Lv1";
    }

    canBuy() {
        if (!this.isUnlocked()) return false;
        if (this.isMaxed()) return false;

        const cost = this.getCost();

        if (this.costResource) {
            return ResourceManager.has(this.costResource, cost);
        }

        return EPManager.has(cost);
    }

    buy() {
        if (!this.isUnlocked() || !this.canBuy()) {
            return false;
        }

        const cost = this.getCost();

        if (this.costResource) {
            if (!ResourceManager.consume(this.costResource, cost)) {
                return false;
            }
        } else if (!EPManager.consume(cost)) {
            return false;
        }

        this.level += 1;
        return true;
    }

    isUnlocked() {
        if (!this.unlocked) return false;

        if (this.prerequisiteId) {
            const prerequisite = this._upgradeManager?.get?.(this.prerequisiteId);
            if (prerequisite) {
                return prerequisite.level >= 1;
            }
        }

        return true;
    }

    setUpgradeManager(manager) {
        this._upgradeManager = manager;
    }

    unlock() {
        this.unlocked = true;
    }

    isMaxed() {
        return this.maxLevel !== null && this.level >= this.maxLevel;
    }

    getRemainingCount() {
        if (this.maxLevel === null) return null;
        return Math.max(0, this.maxLevel - this.level);
    }

    getMultiplier() {
        if (this.type !== "infinite") {
            return Math.pow(this.multiplier, this.level);
        }

        if (this.level <= 50) {
            return Math.pow(this.multiplier, this.level);
        }

        const baseAt50 = Math.pow(this.multiplier, 50);
        return baseAt50 * Math.pow(1.1, this.level - 50);
    }

    getEffectText() {
        return this.effectText;
    }

    getTargetResource() {
        return this.targetResource;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            level: this.level,
            multiplier: this.multiplier,
            effectText: this.effectText,
            targetResource: this.targetResource,
            costResource: this.costResource,
            prerequisiteId: this.prerequisiteId,
            baseCost: this.baseCost.toJSON(),
            type: this.type,
            maxLevel: this.maxLevel,
            unlocked: this.unlocked
        };
    }

    load(data) {
        if (!data) return;

        this.id = data.id;
        this.name = data.name;
        this.level = Math.max(0, Math.floor(Number(data.level) || 0));
        this.multiplier = Number(data.multiplier) || 1;
        this.effectText = String(data.effectText || "");

        if (Object.prototype.hasOwnProperty.call(data, "targetResource")) {
            this.targetResource = ["plant", "metal", "magic"].includes(data.targetResource)
                ? data.targetResource
                : null;
        }

        if (Object.prototype.hasOwnProperty.call(data, "costResource")) {
            this.costResource = ["plant", "metal", "magic"].includes(data.costResource)
                ? data.costResource
                : null;
        }

        if (Object.prototype.hasOwnProperty.call(data, "prerequisiteId")) {
            this.prerequisiteId = data.prerequisiteId || null;
        }

        this.baseCost = BigNumber.from(data.baseCost);

        if (data.type === "limited" || data.type === "infinite") {
            this.type = data.type;
        }

        if (Object.prototype.hasOwnProperty.call(data, "unlocked")) {
            this.unlocked = data.unlocked === true;
        } else if (this.level > 0) {
            this.unlocked = true;
        }

        if (this.type === "infinite" || data.maxLevel === null || data.maxLevel === undefined) {
            this.maxLevel = null;
        } else {
            const parsedMaxLevel = Number(data.maxLevel);
            this.maxLevel = Number.isFinite(parsedMaxLevel)
                ? Math.max(0, Math.floor(parsedMaxLevel))
                : null;
        }

        if (this.maxLevel !== null) {
            this.level = Math.min(this.level, this.maxLevel);
        }
    }
}

export default Upgrade;
