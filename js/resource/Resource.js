/**
 * World Creator
 * Resource
 */

import BigNumber from "../number/BigNumber.js";

class Resource {

    constructor(

        id = "",

        name = "",

        amount = 0,

        production = 0

    ) {

        this.id = id;

        this.name = name;

        this.amount =

            BigNumber.from(
                amount
            );

        this.production =

            BigNumber.from(
                production
            );

    }

    add(value) {

        this.amount =

            this.amount.add(
                value
            );

    }

    subtract(value) {

        this.amount =

            this.amount.subtract(
                value
            );

    }

    setProduction(value) {

        this.production =

            BigNumber.from(
                value
            );

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

    load(data) {

        if (!data) {

            return;

        }

        this.id =
            data.id;

        this.name =
            data.name;

        this.amount =

            BigNumber.from(
                data.amount
            );

        this.production =

            BigNumber.from(
                data.production
            );

    }

}

export default Resource;