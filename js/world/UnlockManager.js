import BigNumber from "../number/BigNumber.js";
import EPManager from "../ep/Manager.js";
import WorldManager from "./Manager.js";
import eventBus from "../core/eventBus.js";

const FIRST_PAID_WORLD_EXPONENT = 100;
const MAX_STANDARD_DECIMAL_EXPONENT = 1000000;

class UnlockManager {
    constructor() {
        this.unlockedWorlds = 0;
        this.firstPaidWorldExponent = FIRST_PAID_WORLD_EXPONENT;
    }

    getUnlockCost() {
        const count = Number(this.unlockedWorlds);

        if (!Number.isInteger(count) || count <= 0) {
            return BigNumber.zero();
        }

        if (count <= 3) {
            let exponent = this.firstPaidWorldExponent;

            for (let i = 2; i <= count; i++) {
                exponent *= 100;
            }

            const base1000Exponent = Math.floor(exponent / 3);
            const decimalRemainder = exponent % 3;
            const mantissa = Math.pow(10, decimalRemainder);

            return new BigNumber(mantissa, base1000Exponent);
        }

        const secondLayerExponent =
            MAX_STANDARD_DECIMAL_EXPONENT +
            (count - 4) * 2;

        return BigNumber.fromLayered(
            1,
            secondLayerExponent,
            2
        );
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
        this.unlockedWorlds = 0;
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
            Number.isInteger(count) && count >= 0
                ? count
                : Math.max(0, WorldManager.getCount());
    }
}

export default new UnlockManager();
