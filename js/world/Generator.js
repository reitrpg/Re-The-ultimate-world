/**
 * World Creator
 * World Generator
 */

import World from "./World.js";

class WorldGenerator {

    hash(seed) {

        let hash = 0;

        const text =
            String(seed);

        for (
            let i = 0;
            i < text.length;
            i++
        ) {

            hash =
                (
                    (hash << 5)
                    - hash
                    + text.charCodeAt(i)
                ) | 0;

        }

        return Math.abs(hash);

    }

    random(seed, index = 0) {

        let value =
            this.hash(
                `${seed}_${index}`
            );

        value =
            (
                value
                * 9301
                + 49297
            )
            % 233280;

        return value / 233280;

    }

    generateName(seed) {

        const prefixes = [

            "Ancient",
            "Crystal",
            "Divine",
            "Forgotten",
            "Eternal",
            "Sacred",
            "Mystic",
            "Infinite",
            "Golden",
            "Shadow"

        ];

        const suffixes = [

            "Forest",
            "Kingdom",
            "Ocean",
            "World",
            "Empire",
            "Garden",
            "Sanctuary",
            "Abyss",
            "Realm",
            "Tree"

        ];

        const prefix =

            prefixes[
                Math.floor(
                    this.random(seed, 1)
                    * prefixes.length
                )
            ];

        const suffix =

            suffixes[
                Math.floor(
                    this.random(seed, 2)
                    * suffixes.length
                )
            ];

        return `${prefix} ${suffix}`;

    }

    generateRarity(seed) {

        const value =
            this.random(seed, 3);

        if (value < 0.50) {

            return 1;

        }

        if (value < 0.75) {

            return 2;

        }

        if (value < 0.90) {

            return 3;

        }

        if (value < 0.98) {

            return 4;

        }

        return 5;

    }

    generateEffect(seed) {

        return (
            1
            + this.random(seed, 4)
        );

    }

    generateProductionMultiplier(seed) {

        return (
            1
            + this.random(seed, 5)
            * 2
        );

    }

    generate(seed) {

        const worldSeed =
            String(seed);

        const world = new World({

            id:
                `world_${this.hash(worldSeed)}`,

            name:
                this.generateName(
                    worldSeed
                ),

            seed:
                worldSeed,

            rarity:
                this.generateRarity(
                    worldSeed
                ),

            effect:
                this.generateEffect(
                    worldSeed
                ),

            productionMultiplier:
                this.generateProductionMultiplier(
                    worldSeed
                )

        });

        return world;

    }

}

export default new WorldGenerator();