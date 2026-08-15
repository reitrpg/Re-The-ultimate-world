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

        this.baseCost =
            BigNumber.from(1000);

    }

    getUnlockCost() {

        const worldCount =

            Math.max(

                1,

                WorldManager.getCount()

            );

        const cost =

            Math.pow(

                10,

                worldCount + 2

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

    unlock() {

        if (

            !this.canUnlock()

        ) {

            return false;

        }

        EPManager.consume(

            this.getUnlockCost()

        );

        const world =

            WorldManager.create(

                Date.now()
                    .toString()

            );

        eventBus.emit(

            "world:unlock",

            world

        );

        return true;

    }

    toJSON() {

        return {

            baseCost:

                this.baseCost
                    .toJSON()

        };

    }

    load(data) {

        if (!data) {

            return;

        }

        this.baseCost =

            BigNumber.from(

                data.baseCost || 1000

            );

    }

}

export default new UnlockManager();