/**
 * World Creator
 * Research
 */

import EPManager from "../ep/Manager.js";

import BigNumber from "../number/BigNumber.js";

class Research {

    constructor(

        id = "",

        name = "",

        multiplier = 1,

        cost = 0

    ) {

        this.id = id;

        this.name = name;

        this.level = 0;

        this.multiplier = multiplier;

        this.baseCost =

            BigNumber.from(
                cost
            );

    }

    getCost() {

        return this.baseCost.multiply(

            Math.pow(

                2,

                this.level

            )

        );

    }

    canBuy() {

        return EPManager.has(

            this.getCost()

        );

    }

    buy() {

        if (

            !this.canBuy()

        ) {

            return false;

        }

        EPManager.consume(

            this.getCost()

        );

        this.level++;

        return true;

    }

    getMultiplier() {

        return Math.pow(

            this.multiplier,

            this.level

        );

    }

    toJSON() {

        return {

            id:
                this.id,

            name:
                this.name,

            level:
                this.level,

            multiplier:
                this.multiplier,

            baseCost:

                this.baseCost
                    .toJSON()

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

        this.level =
            data.level || 0;

        this.multiplier =
            data.multiplier;

        this.baseCost =

            BigNumber.from(

                data.baseCost

            );

    }

}

export default Research;