import World from "./World.js";

const FEATURE_DEFINITIONS = {
    plant: {
        name: "植物の大地",
        multipliers: { plant: 1.4, metal: 0.75, magic: 1 }
    },
    metal: {
        name: "豊かな鉱脈",
        multipliers: { plant: 1, metal: 1.4, magic: 0.75 }
    },
    magic: {
        name: "魔力の源泉",
        multipliers: { plant: 0.75, metal: 1, magic: 1.4 }
    }
};

class WorldGenerator {
    hash(seed) {
        let hash = 0;
        const text = String(seed);
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
        }
        return Math.abs(hash);
    }

    random(seed, index = 0) {
        let value = this.hash(`${seed}_${index}`);
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
    }

    generateName(seed, language = "ja") {
        const names = {
            ja: {
                prefixes: ["古代","水晶","神聖","忘却","永遠","聖なる","神秘","無限","黄金","影"],
                suffixes: ["森林","王国","海洋","世界","帝国","庭園","聖域","深淵","領域","樹"]
            },
            en: {
                prefixes: ["Ancient","Crystal","Divine","Forgotten","Eternal","Sacred","Mystic","Infinite","Golden","Shadow"],
                suffixes: ["Forest","Kingdom","Ocean","World","Empire","Garden","Sanctuary","Abyss","Realm","Tree"]
            }
        };
        const locale = names[language] || names.ja;
        return language === "ja"
            ? locale.prefixes[Math.floor(this.random(seed, 1) * locale.prefixes.length)] +
              locale.suffixes[Math.floor(this.random(seed, 2) * locale.suffixes.length)]
            : `${locale.prefixes[Math.floor(this.random(seed, 1) * locale.prefixes.length)]} ${locale.suffixes[Math.floor(this.random(seed, 2) * locale.suffixes.length)]}`;
    }

    getBaseRarityProbabilities() {
        return [0.5, 0.25, 0.15, 0.08, 0.02];
    }

    getEffectiveLuck(luck) {
        const value = Math.max(0, Number(luck) || 0);
        return Math.log1p(value);
    }

    getRarityLuckCost(rarityIndex) {
        const baseCost = 10;
        const exponent = 1.5;
        return baseCost * Math.pow(rarityIndex, exponent);
    }

    getLuckAdjustedRarityProbabilities(luck = 0) {
        const probabilities = this.getBaseRarityProbabilities().slice();
        const currentLuck = Math.max(1, Number(luck) || 1);

        if (currentLuck < 2) {
            return [1, 0, 0, 0, 0];
        }

        let remainingLuck = this.getEffectiveLuck(currentLuck);

        for (let index = 0; index < probabilities.length - 1; index += 1) {
            const cost = this.getRarityLuckCost(index + 1);
            const transfer = Math.min(
                probabilities[index],
                remainingLuck / cost
            );

            probabilities[index] -= transfer;
            probabilities[index + 1] += transfer;
            remainingLuck = Math.max(
                0,
                remainingLuck - transfer * cost
            );

            if (remainingLuck <= 0) break;
        }

        return probabilities;
    }

    generateRarity(seed, luck = 0) {
        const value = this.random(seed, 3);
        const probabilities = this.getLuckAdjustedRarityProbabilities(luck);

        let cumulative = 0;

        for (let index = 0; index < probabilities.length; index += 1) {
            cumulative += probabilities[index];

            if (value < cumulative) {
                return index + 1;
            }
        }

        return probabilities.length;
    }

    generateEffect(seed) {
        return 1 + this.random(seed, 4);
    }

    generateResourceFeatures(seed) {
        const featureIds = Object.keys(FEATURE_DEFINITIONS);
        const featureId = featureIds[Math.floor(this.random(seed, 5) * featureIds.length)];
        const feature = FEATURE_DEFINITIONS[featureId];

        return {
            multipliers: { ...feature.multipliers },
            names: {
                plant: feature.name,
                metal: feature.name,
                magic: feature.name
            }
        };
    }

    generate(seed, language = "ja") {
        const worldSeed = String(seed);
        const world = new World(worldSeed);

        world.name = this.generateName(worldSeed, language);
        world.nameCustom = false;
        world.nameLanguage = language;
        world.luck = 0;
        world.rarity = this.generateRarity(worldSeed, world.getLuck());
        world.uniqueEffect = this.generateEffect(worldSeed);

        const features = this.generateResourceFeatures(worldSeed);
        world.resourceMultipliers = features.multipliers;
        world.resourceFeatures = features.names;

        return world;
    }
}

export default new WorldGenerator();