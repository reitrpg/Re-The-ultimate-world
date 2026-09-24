import EPManager from "../ep/Manager.js";
import BigNumber from "../number/BigNumber.js";

class Research {
    constructor(
        id = "",
        name = "",
        multiplier = 1,
        cost = 0
    ) {
        this.id = id;
        this.name = name;
        this.level = 0;
        this.multiplier = Number(multiplier) || 1;
        this.baseCost = BigNumber.from(cost);
    }

    getCost() {
        return this.baseCost.multiply(
            Math.pow(2, this.level)
        );
    }

    getMultiplier() {
        return Math.pow(
            this.multiplier,
            this.level
        );
    }

    canBuy() {
        return EPManager.has(this.getCost());
    }

    buy() {
        const cost = this.getCost();

        if (!this.canBuy()) {
            return false;
        }

        if (!EPManager.consume(cost)) {
            return false;
        }

        this.level += 1;
        return true;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            level: this.level,
            multiplier: this.multiplier,
            baseCost: this.baseCost.toJSON()
        };
    }

    load(data) {
        if (!data || typeof data !== "object") {
            return;
        }

        this.id = String(data.id ?? this.id);
        this.name = String(data.name ?? this.name);
        this.level = Math.max(
            0,
            Math.floor(Number(data.level) || 0)
        );
        this.multiplier =
            Number(data.multiplier) || this.multiplier;
        this.baseCost =
            BigNumber.from(data.baseCost);
    }
}

export default Research;
