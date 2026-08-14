/**
 * World Creator
 * EP Manager
 */

import BigNumber from "../number/BigNumber.js";
import eventBus from "../core/eventBus.js";

class EPManager {

    constructor() {

        this.amount =
            new BigNumber();

        this.totalEarned =
            new BigNumber();

    }

    get() {

        return this.amount;

    }

    getTotalEarned() {

        return this.totalEarned;

    }

    set(value) {

        this.amount =
            BigNumber.from(value);

        eventBus.emit(
            "ep:update",
            this.amount
        );

    }

    add(value) {

        const gain =
            BigNumber.from(value);

        this.amount =
            this.amount.add(
                gain
            );

        this.totalEarned =
            this.totalEarned.add(
                gain
            );

        eventBus.emit(
            "ep:update",
            this.amount
        );

    }

    consume(value) {

        const cost =
            BigNumber.from(value);

        if (
            !this.has(cost)
        ) {

            return false;

        }

        this.amount =
            this.amount.subtract(
                cost
            );

        eventBus.emit(
            "ep:update",
            this.amount
        );

        return true;

    }

    has(value) {

        return this.amount.greaterOrEqual(
            BigNumber.from(value)
        );

    }

    reset() {

        this.amount =
            new BigNumber();

        this.totalEarned =
            new BigNumber();

        eventBus.emit(
            "ep:update",
            this.amount
        );

    }

    toJSON() {

        return {

            amount:
                this.amount.toJSON(),

            totalEarned:
                this.totalEarned.toJSON()

        };

    }

    load(data) {

        if (!data) {

            return;

        }

        this.amount =
            BigNumber.fromJSON(
                data.amount
            );

        this.totalEarned =
            BigNumber.fromJSON(
                data.totalEarned
            );

        eventBus.emit(
            "ep:update",
            this.amount
        );

    }

}

export default new EPManager();