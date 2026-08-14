/**
 * World Creator
 * World Unlock Manager
 */

import BigNumber from "../number/BigNumber.js";

import EPManager from "../ep/Manager.js";

import WorldManager from "./Manager.js";

import eventBus from "../core/eventBus.js";

class UnlockManager {

    constructor() {

        this.unlockedWorlds = 1;

        this.baseCost =
            BigNumber.from(10000);

    }

    getUnlockCost() {

        const cost =

            10000 *

            Math.pow(

                10,

                this.unlockedWorlds - 1

            );

        return BigNumber.from(
            cost
        );

    }

    canUnlock() {

        return EPManager.has(

            this.getUnlockCost()

        );

    }

    unlock(seed) {

        if (

            !this.canUnlock()

        ) {

            return false;

        }

        EPManager.consume(

            this.getUnlockCost()

        );

        WorldManager.create(

            seed ||

            Date.now().toString()

        );

        this.unlockedWorlds++;

        eventBus.emit(

            "world:unlock"

        );

        return true;

    }

    getUnlockedWorldCount() {

        return this.unlockedWorlds;

    }

    toJSON() {

        return {

            unlockedWorlds:

                this.unlockedWorlds

        };

    }

    load(data) {

        if (!data) {

            return;

        }

        this.unlockedWorlds =

            data.unlockedWorlds || 1;

    }

}

export default new UnlockManager();