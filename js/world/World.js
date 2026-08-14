/**
 * World Creator
 * World
 */

import BigNumber from "../number/BigNumber.js";

class World {

    constructor({
        id = "",
        name = "Unknown World",
        seed = "",
        rarity = 1,
        level = 1,
        exp = 0,
        rebirthMultiplier = 1,
        effect = 1,
        productionMultiplier = 1
    } = {}) {

        this.id = id;

        this.name = name;

        this.seed = seed;

        this.rarity = rarity;

        this.level = level;

        this.exp =
            BigNumber.from(exp);

        this.rebirthMultiplier =
            BigNumber.from(
                rebirthMultiplier
            );

        this.effect =
            BigNumber.from(effect);

        this.productionMultiplier =
            BigNumber.from(
                productionMultiplier
            );

    }

    addExp(value) {

        this.exp =
            this.exp.add(value);

        this.checkLevelUp();

    }

    getRequiredExp() {

        return BigNumber.from(

            Math.pow(
                this.level,
                2
            ) * 100

        );

    }

    checkLevelUp() {

        let required =
            this.getRequiredExp();

        while (
            this.exp.greaterOrEqual(
                required
            )
        ) {

            this.exp =
                this.exp.subtract(
                    required
                );

            this.level++;

            required =
                this.getRequiredExp();

        }

    }

    getLevelMultiplier() {

        return BigNumber.from(

            (
                this.level *
                this.level
            ) / 100

        );

    }

    getTotalMultiplier() {

        return this.productionMultiplier
            .multiply(
                this.effect
            )
            .multiply(
                this.rebirthMultiplier
            )
            .multiply(
                this.getLevelMultiplier()
            )
            .multiply(
                this.rarity
            );

    }

    toJSON() {

        return {

            id:
                this.id,

            name:
                this.name,

            seed:
                this.seed,

            rarity:
                this.rarity,

            level:
                this.level,

            exp:
                this.exp.toJSON(),

            rebirthMultiplier:
                this.rebirthMultiplier.toJSON(),

            effect:
                this.effect.toJSON(),

            productionMultiplier:
                this.productionMultiplier.toJSON()

        };

    }

    static fromJSON(data) {

        return new World({

            id:
                data.id,

            name:
                data.name,

            seed:
                data.seed,

            rarity:
                data.rarity,

            level:
                data.level,

            exp:
                BigNumber.fromJSON(
                    data.exp
                ),

            rebirthMultiplier:
                BigNumber.fromJSON(
                    data.rebirthMultiplier
                ),

            effect:
                BigNumber.fromJSON(
                    data.effect
                ),

            productionMultiplier:
                BigNumber.fromJSON(
                    data.productionMultiplier
                )

        });

    }

}

export default World;