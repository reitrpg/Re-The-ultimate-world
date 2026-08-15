/**
 * World Creator
 * World
 */

import BigNumber from "../number/BigNumber.js";

import ResourceManager from "../resource/Manager.js";

class World {

    constructor(seed = Date.now().toString()) {

        this.seed = seed;

        this.name =
            `World-${seed.slice(-4)}`;

        this.rarity =
            this.generateRarity();

        this.level = 1;

        this.exp =
            BigNumber.zero();

        this.rebirthMultiplier =
            BigNumber.one();

        this.baseProduction =
            BigNumber.one();

        this.uniqueEffect =
            1;

    }

    generateRarity() {

        const value =
            Number(
                this.seed
                    .toString()
                    .slice(-2)
            );

        return Math.max(
            1,
            Math.floor(
                value / 10
            ) + 1
        );

    }

    getLevelMultiplier() {

        return (

            this.level *
            this.level

        ) / 100;

    }

    getRarityMultiplier() {

        return this.rarity;

    }

    getTotalMultiplier() {

        let multiplier =
            this.baseProduction
                .toNumber();

        multiplier *=
            this.getRarityMultiplier();

        multiplier *=
            this.getLevelMultiplier();

        multiplier *=
            this.uniqueEffect;

        multiplier *=
            this.rebirthMultiplier
                .toNumber();

        return BigNumber.from(
            multiplier
        );

    }

    gainExperience(amount) {

        this.exp =
            this.exp.add(
                amount
            );

    }

    levelUp() {

        this.level += 1;

    }

    update(deltaTime) {

        const amount =
            this.getTotalMultiplier()
                .multiply(
                    deltaTime
                );

        ResourceManager.produce(
            amount
        );

    }

    toJSON() {

        return {

            seed:
                this.seed,

            name:
                this.name,

            rarity:
                this.rarity,

            level:
                this.level,

            exp:
                this.exp.toJSON(),

            rebirthMultiplier:

                this.rebirthMultiplier
                    .toJSON(),

            baseProduction:

                this.baseProduction
                    .toJSON(),

            uniqueEffect:

                this.uniqueEffect

        };

    }

    load(data) {

        if (!data) {

            return;

        }

        this.seed =
            data.seed;

        this.name =
            data.name;

        this.rarity =
            data.rarity;

        this.level =
            data.level;

        this.exp =
            BigNumber.from(
                data.exp
            );

        this.rebirthMultiplier =
            BigNumber.from(
                data.rebirthMultiplier
            );

        this.baseProduction =
            BigNumber.from(
                data.baseProduction
            );

        this.uniqueEffect =
            data.uniqueEffect;

    }

}

export default World;