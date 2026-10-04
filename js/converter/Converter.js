/**
 * World Creator
 * Converter
 */

import ResourceManager from "../resource/Manager.js";
import EPManager from "../ep/Manager.js";
import BigNumber from "../number/BigNumber.js";
import eventBus from "../core/eventBus.js";
import AchievementManager from "../achievements/Manager.js";

class Converter {
    constructor() {
        this.recipes = new Map();
        this.initialize();
    }

    initialize() {
        this.addRecipe({
            id: "plant_to_ep",
            name: "植物 → EP",
            resourceId: "plant",
            resourceCost: 10,
            epReward: 1
        });
        this.addRecipe({
            id: "metal_to_ep",
            name: "金属 → EP",
            resourceId: "metal",
            resourceCost: 10,
            epReward: 1
        });
        this.addRecipe({
            id: "magic_to_ep",
            name: "魔力 → EP",
            resourceId: "magic",
            resourceCost: 10,
            epReward: 1
        });
    }

    addRecipe(recipe) {
        this.recipes.set(recipe.id, {
            id: recipe.id,
            name: recipe.name,
            resourceId: recipe.resourceId,
            resourceCost: BigNumber.from(recipe.resourceCost),
            epReward: BigNumber.from(recipe.epReward)
        });
    }

    getRecipe(id) {
        return this.recipes.get(id);
    }

    getRecipes() {
        return Array.from(this.recipes.values());
    }

    canConvert(id) {
        const recipe = this.getRecipe(id);
        return Boolean(
            recipe &&
            ResourceManager.has(recipe.resourceId, recipe.resourceCost)
        );
    }

    convert(id) {
        const recipe = this.getRecipe(id);
        if (!recipe || !this.canConvert(id)) return false;

        if (!ResourceManager.consume(recipe.resourceId, recipe.resourceCost)) return false;

        EPManager.add(
            recipe.epReward.multiply(
                AchievementManager.getTotalMultiplier()
            )
        );

        eventBus.emit("converter:update", recipe);
        return true;
    }

    getWholeCount(amount, unitCost) {
        const quotient = BigNumber.from(amount).divide(unitCost);

        if (quotient.lessOrEqual(0)) return BigNumber.zero();

        // Layered values are already far beyond normal Number precision.
        // At this scale, the stored representation is treated as an integer count.
        if (quotient.layer > 0) return quotient;

        if (quotient.exponent < 0) {
            return BigNumber.zero();
        }

        if (quotient.exponent === 0) {
            return BigNumber.from(Math.floor(quotient.mantissa));
        }

        // The internal base is 1000. An exponent >= 1 represents a whole
        // resource count at the game's supported precision.
        return BigNumber.fromLayered(
            Math.floor(quotient.mantissa),
            quotient.exponent,
            quotient.layer
        );
    }

    convertByAmount(id, amount) {
        const recipe = this.getRecipe(id);
        if (!recipe) return 0;

        const requested = BigNumber.from(amount);
        if (requested.lessOrEqual(0)) return 0;

        const resource = ResourceManager.get(recipe.resourceId);
        if (!resource) return 0;

        const availableCount = this.getWholeCount(
            resource.amount,
            recipe.resourceCost
        );
        const requestedCount = this.getWholeCount(
            requested,
            recipe.resourceCost
        );

        let count = availableCount.lessOrEqual(requestedCount)
            ? availableCount
            : requestedCount;

        if (count.lessOrEqual(0)) return 0;

        const resourceCost = recipe.resourceCost.multiply(count);
        const epReward = recipe.epReward
            .multiply(count)
            .multiply(AchievementManager.getTotalMultiplier());

        if (!ResourceManager.consume(recipe.resourceId, resourceCost)) return 0;

        EPManager.add(epReward);
        eventBus.emit("converter:update", recipe);

        const numericCount = count.toNumber();
        return Number.isFinite(numericCount) ? numericCount : Number.MAX_VALUE;
    }

    convertByRate(id, rate) {
        const recipe = this.getRecipe(id);
        if (!recipe) return 0;

        const resource = ResourceManager.get(recipe.resourceId);
        if (!resource) return 0;

        const usable = resource.amount.multiply(rate);
        const count = Math.min(
            1000,
            Math.max(
                0,
                Math.floor(
                    usable.divide(recipe.resourceCost).toNumber()
                )
            )
        );

        if (count <= 0) return 0;

        return this.convertByAmount(
            id,
            recipe.resourceCost.multiply(count)
        );
    }

    convertAll(id) {
        const recipe = this.getRecipe(id);
        if (!recipe) return 0;

        const resource = ResourceManager.get(recipe.resourceId);
        if (!resource) return 0;

        const count = this.getWholeCount(
            resource.amount,
            recipe.resourceCost
        );

        if (count.lessOrEqual(0)) return 0;

        const resourceCost = recipe.resourceCost.multiply(count);
        const epReward = recipe.epReward
            .multiply(count)
            .multiply(AchievementManager.getTotalMultiplier());

        if (!ResourceManager.consume(recipe.resourceId, resourceCost)) return 0;

        EPManager.add(epReward);
        eventBus.emit("converter:update", recipe);

        const numericCount = count.toNumber();
        return Number.isFinite(numericCount) ? numericCount : Number.MAX_VALUE;
    }
}

export default new Converter();
