/**
 * World Creator
 * Rebirth Manager
 */

import BigNumber from "../number/BigNumber.js";

import EPManager from "../ep/Manager.js";
import ResourceManager from "../resource/Manager.js";
import ResearchManager from "../research/Manager.js";
import WorldManager from "../world/Manager.js";

import eventBus from "../core/eventBus.js";

class RebirthManager {

    constructor() {

        this.multiplier =
            BigNumber.from(1);

        this.count = 0;

        this.requiredEP =
            BigNumber.from(100000);

    }

    canRebirth() {

        return EPManager.has(
            this.requiredEP
        );

    }

    calculateMultiplier() {

        const totalEP =
            EPManager
                .getTotalEarned()
                .toNumber();

        const bonus =

            Math.max(
                1,
                Math.sqrt(
                    totalEP / 100000
                )
            );

        return BigNumber.from(
            bonus
        );

    }

    rebirth() {

        if (
            !this.canRebirth()
        ) {

            return false;

        }

        this.multiplier =
            this.multiplier.add(

                this.calculateMultiplier()

            );

        this.count++;

        ResourceManager.clear();

        EPManager.reset();

        ResearchManager.reset();

        const world =
            WorldManager.getActive();

        if (world) {

            world.level = 1;

            world.exp =
                BigNumber.from(0);

            world.rebirthMultiplier =
                this.multiplier;

        }

        eventBus.emit(
            "rebirth:update"
        );

        return true;

    }

    getMultiplier() {

        return this.multiplier;

    }

    getCount() {

        return this.count;

    }

    toJSON() {

        return {

            multiplier:
                this.multiplier.toJSON(),

            count:
                this.count

        };

    }

    load(data) {

        if (!data) {

            return;

        }

        this.multiplier =
            BigNumber.fromJSON(
                data.multiplier
            );

        this.count =
            data.count || 0;

    }

}

export default new RebirthManager();