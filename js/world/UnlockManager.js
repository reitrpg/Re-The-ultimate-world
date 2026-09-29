import BigNumber from "../number/BigNumber.js";
import EPManager from "../ep/Manager.js";
import WorldManager from "./Manager.js";
import eventBus from "../core/eventBus.js";

const MAX_DECIMAL_EXPONENT = 1000000;

class UnlockManager {
    constructor() {
        this.unlockedWorlds = 1;
        this.firstPaidWorldExponent = 100;
    }

    getUnlockCost() {
        const count = Number(this.unlockedWorlds);

        if (!Number.isInteger(count) || count <= 1) {
            return new BigNumber(10, 33);
        }

        let exponent = this.firstPaidWorldExponent;

        for (let i = 2; i <= count && exponent < MAX_DECIMAL_EXPONENT; i++) {
            exponent = Math.min(
                MAX_DECIMAL_EXPONENT,
                exponent * 100
            );
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

    reset() {
        this.unlockedWorlds = 1;
        eventBus.emit("world:unlock:update");
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
