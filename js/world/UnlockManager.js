import BigNumber from "../number/BigNumber.js";
import EPManager from "../ep/Manager.js";
import WorldManager from "./Manager.js";
import eventBus from "../core/eventBus.js";

class UnlockManager {
    constructor() {
        this.unlockedWorlds = 1;
        this.firstPaidWorldCost = BigNumber.from(1e100);
        this.costMultiplier = BigNumber.from(1e100);
    }

    getUnlockCost() {
        // World #1 is created for 0 EP during initialization.
        // World #2 costs 1e100 EP.
        // Every later world costs the previous world's unlock cost × 1e100.
        let cost = this.firstPaidWorldCost.clone();

        for (let i = 1; i < this.unlockedWorlds; i++) {
            cost = cost.multiply(this.costMultiplier);
        }

        return cost;
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
