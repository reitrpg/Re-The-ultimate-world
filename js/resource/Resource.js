/**
 * World Creator
 * Resource
 */

import BigNumber from "../number/BigNumber.js";

class Resource {

    constructor(
        id,
        name,
        amount = 0,
        production = 0
    ) {

        this.id = id;

        this.name = name;

        this.amount =
            BigNumber.from(amount);

        this.production =
            BigNumber.from(production);

    }

    add(value) {

        this.amount =
            this.amount.add(value);

    }

    subtract(value) {

        const cost =
            BigNumber.from(value);

        if (
            this.amount.less(cost)
        ) {

            return false;

        }

        this.amount =
            this.amount.subtract(cost);

        return true;

    }

    has(value) {

        return this.amount.greaterOrEqual(
            value
        );

    }

    setProduction(value) {

        this.production =
            BigNumber.from(value);

    }

    produce(multiplier = 1) {

        const gain =
            this.production.multiply(
                multiplier
            );

        this.amount =
            this.amount.add(gain);

    }

    toJSON() {

        return {

            id:
                this.id,

            name:
                this.name,

            amount:
                this.amount.toJSON(),

            production:
                this.production.toJSON()

        };

    }

    static fromJSON(data) {

        const resource =
            new Resource(
                data.id,
                data.name
            );

        resource.amount =
            BigNumber.fromJSON(
                data.amount
            );

        resource.production =
            BigNumber.fromJSON(
                data.production
            );

        return resource;

    }

}

export default Resource;