import BigNumber from "../number/BigNumber.js";
import EPManager from "../ep/Manager.js";
import WorldManager from "./Manager.js";
import eventBus from "../core/eventBus.js";

class UnlockManager {
    constructor() {
        this.unlockedWorlds = 1;
        this.firstPaidWorldExponent = 100;
    }

    getUnlockCost() {
        // World #1: 0 EP
        // World #2: 1e100
        // World #3: 1e10000
        // World #4: 1e1000000
        // Each additional world multiplies the exponent by 100.
        if (this.unlockedWorlds <= 1) {
            return BigNumber.zero();
        }

        let exponent = this.firstPaidWorldExponent;

        for (let i = 2; i < this.unlockedWorlds; i++) {
            exponent *= 100;
        }

        const base1000Exponent = Math.floor(exponent / 3);
        const decimalRemainder = exponent % 3;
        const mantissa = Math.pow(10, decimalRemainder);

        return new BigNumber(mantissa, base1000Exponent);
    }

    getUnlockFailureReason() {
        const cost = this.getUnlockCost();

        if (!EPManager.has(cost)) {
            return {
                code: "INSUFFICIENT_EP",
                required: cost,
                current: EPManager.get()
            };
        }

        return null;
    }

    canUnlock() {
        return this.getUnlockFailureReason() === null;
    }

    unlock(seed) {
        const failure = this.getUnlockFailureReason();

        if (failure) {
            eventBus.emit("world:unlock:failed", failure);
            return false;
        }

        const cost = this.getUnlockCost();

        if (!EPManager.consume(cost)) {
            eventBus.emit("world:unlock:failed", {
                code: "EP_CONSUME_FAILED",
                required: cost,
                current: EPManager.get()
            });
            return false;
        }

        const world = WorldManager.create(
            seed || Date.now().toString()
        );

        this.unlockedWorlds++;
        eventBus.emit("world:unlock", world);

        return true;
    }

    getUnlockedWorldCount() {
        return this.unlockedWorlds;
    }

    toJSON() {
        return {
            unlockedWorlds: this.unlockedWorlds
        };
    }

    load(data) {
        const count = data && Number(data.unlockedWorlds);

        this.unlockedWorlds =
            Number.isInteger(count) && count >= 1
                ? count
                : Math.max(1, WorldManager.getCount());
    }
}

export default new UnlockManager();
