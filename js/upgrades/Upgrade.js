/**
 * World Creator
 * Upgrade
 */

import EPManager from "../ep/Manager.js";
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
        targetResource = null
    ) {
        this.id = id;
        this.name = name;
        this.level = 0;
        this.multiplier = multiplier;
        this.effectText = String(effectText || "");
        this.targetResource = ["plant", "metal", "magic"].includes(targetResource) ? targetResource : null;
        this.baseCost = BigNumber.from(cost);
        this.type = type === "limited" ? "limited" : "infinite";
        this.unlocked = true;
        this.maxLevel = Number.isFinite(Number(maxLevel))
            ? Math.max(0, Math.floor(Number(maxLevel)))
            : null;
    }

    getCost() {
        // 無限強化は初期費用を維持しつつ、Lvに対して二次関数的に
        // コストが増加するようにする。
        // Lv0: baseCost / Lv1: 6base / Lv2: 21base / Lv3: 46base ...
        if (this.type === "infinite") {
            const levelFactor = 1 + (5 * Math.pow(this.level, 2));
            return this.baseCost.multiply(levelFactor);
        }

        const levelFactor = Math.pow(this.level + 1, 2);
        return this.baseCost.multiply(levelFactor);
    }

    canBuy() {
        if (!this.unlocked) return false;
        if (this.isMaxed()) return false;
        return EPManager.has(this.getCost());
    }

    buy() {
        if (!this.unlocked || !this.canBuy()) {
            return false;
        }

        if (!EPManager.consume(this.getCost())) {
            return false;
        }

        this.level += 1;
        return true;
    }

    isUnlocked() {
        return this.unlocked === true;
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
        return Math.pow(this.multiplier, this.level);
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
