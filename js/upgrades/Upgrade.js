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
        maxLevel = null
    ) {
        this.id = id;
        this.name = name;
        this.level = 0;
        this.multiplier = multiplier;
        this.baseCost = BigNumber.from(cost);
        this.type = type === "limited" ? "limited" : "infinite";
        this.maxLevel = Number.isFinite(Number(maxLevel))
            ? Math.max(0, Math.floor(Number(maxLevel)))
            : null;
    }

    getCost() {
        return this.baseCost.multiply(Math.pow(2, this.level));
    }

    canBuy() {
        if (this.isMaxed()) {
            return false;
        }

        return EPManager.has(this.getCost());
    }

    buy() {
        if (!this.canBuy()) {
            return false;
        }

        EPManager.consume(this.getCost());
        this.level += 1;
        return true;
    }

    isMaxed() {
        return this.maxLevel !== null && this.level >= this.maxLevel;
    }

    getRemainingCount() {
        if (this.maxLevel === null) {
            return null;
        }

        return Math.max(0, this.maxLevel - this.level);
    }

    getMultiplier() {
        return Math.pow(this.multiplier, this.level);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            level: this.level,
            multiplier: this.multiplier,
            baseCost: this.baseCost.toJSON(),
            type: this.type,
            maxLevel: this.maxLevel
        };
    }

    load(data) {
        if (!data) {
            return;
        }

        this.id = data.id;
        this.name = data.name;
        this.level = Math.max(0, Math.floor(Number(data.level) || 0));
        this.multiplier = Number(data.multiplier) || 1;
        this.baseCost = BigNumber.from(data.baseCost);

        if (data.type === "limited" || data.type === "infinite") {
            this.type = data.type;
        }

        this.maxLevel = Number.isFinite(Number(data.maxLevel))
            ? Math.max(0, Math.floor(Number(data.maxLevel)))
            : null;

        if (this.maxLevel !== null) {
            this.level = Math.min(this.level, this.maxLevel);
        }
    }
}

export default Upgrade;
