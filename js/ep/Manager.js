/**
 * World Creator
 * EP Manager
 */

import BigNumber from "../number/BigNumber.js";

import eventBus from "../core/eventBus.js";

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

        eventBus.emit(
            "ep:update"
        );

    }

    add(value) {

        this.amount =

            this.amount.add(
                value
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

            this.amount.lt(
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

        return this.amount.gte(
            value
        );

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