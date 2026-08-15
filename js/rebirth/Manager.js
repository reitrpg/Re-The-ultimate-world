/**
 * World Creator
 * Rebirth Manager
 */

import BigNumber from "../number/BigNumber.js";

import eventBus from "../core/eventBus.js";

class RebirthManager {

    constructor() {

        this.count = 0;

        this.multiplier =
            BigNumber.one();

    }

    getCount() {

        return this.count;

    }

    getMultiplier() {

        return this.multiplier;

    }

    calculateMultiplier() {

        const value =

            Math.max(

                1,

                (
                    this.count + 1
                ) ** 2 / 100

            );

        this.multiplier =

            BigNumber.from(
                value
            );

        return this.multiplier;

    }

    rebirth() {

        this.count++;

        this.calculateMultiplier();

        eventBus.emit(

            "rebirth:update"

        );

    }

    reset() {

        this.count = 0;

        this.multiplier =
            BigNumber.one();

    }

    toJSON() {

        return {

            count:
                this.count,

            multiplier:

                this.multiplier
                    .toJSON()

        };

    }

    load(data) {

        if (!data) {

            return;

        }

        this.count =
            data.count || 0;

        this.multiplier =

            BigNumber.from(

                data.multiplier || 1

            );

    }

}

export default new RebirthManager();