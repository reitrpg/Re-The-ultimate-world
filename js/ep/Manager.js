/**
 * World Creator
 * EP Manager
 */

import BigNumber from "../number/BigNumber.js";

import eventBus from "../core/eventBus.js";
import StatisticsManager from "../statistics/Manager.js";

class EPManager {

    constructor() {

        this.amount =
            BigNumber.zero();

    }

    get() {

        return this.amount;

    }

    set(value) {

        this.amount =

            BigNumber.from(
                value
            );

        StatisticsManager.recordEP(gain);
        eventBus.emit(
            "ep:update"
        );

    }

    add(value) {

        const gain = BigNumber.from(value);
        this.amount =

            this.amount.add(
                gain
            );

        eventBus.emit(
            "ep:update"
        );

    }

    consume(value) {

        const cost =

            BigNumber.from(
                value
            );

        if (

            this.amount.less(
                cost
            )

        ) {

            return false;

        }

        this.amount =

            this.amount.subtract(
                cost
            );

        eventBus.emit(
            "ep:update"
        );

        return true;

    }

    has(value) {

        return this.amount.greaterOrEqual(value);

    }

    reset() {

        this.amount =
            BigNumber.zero();

        eventBus.emit(
            "ep:update"
        );

    }

    toJSON() {

        return {

            amount:

                this.amount
                    .toJSON()

        };

    }

    load(data) {

        if (!data) {

            return;

        }

        this.amount =

            BigNumber.from(

                data.amount || 0

            );

    }

}

export default new EPManager();