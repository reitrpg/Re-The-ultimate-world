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
            name: "植物",
            resourceId: "plant",
            resourceCost: 10,
            epReward: 1
        });
        this.addRecipe({
            id: "metal_to_ep",
            name: "金属",
            resourceId: "metal",
            resourceCost: 10,
            epReward: 1
        });
        this.addRecipe({
            id: "magic_to_ep",
            name: "魔力",
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
        if (!recipe || !recipe.resourceCost.greater(0) || !recipe.epReward.greater(0)) {
            return false;
        }

        return ResourceManager.has(recipe.resourceId, recipe.resourceCost);
    }

    getReward(recipe, count = BigNumber.one()) {
        if (!recipe) return null;

        const amount = BigNumber.from(count);
        const multiplier = BigNumber.from(AchievementManager.getTotalMultiplier());

        if (
            !amount.isFinite() ||
            !amount.greater(0) ||
            !multiplier.isFinite() ||
            !multiplier.greater(0)
        ) {
            return null;
        }

        const reward = recipe.epReward.multiply(amount).multiply(multiplier);

        return reward.isFinite() && reward.greater(0)
            ? reward
            : null;
    }

    convert(id) {
        const recipe = this.getRecipe(id);
        if (!recipe || !this.canConvert(id)) return false;

        const reward = this.getReward(recipe);
        if (!reward) return false;

        if (!ResourceManager.consume(recipe.resourceId, recipe.resourceCost)) {
            return false;
        }

        if (!EPManager.add(reward)) {
            // The reward was validated before consumption; this is a final
            // consistency guard for unexpected state changes.
            ResourceManager.add(recipe.resourceId, recipe.resourceCost);
            return false;
        }

        eventBus.emit("converter:update", recipe);
        return true;
    }

    getWholeCount(amount, unitCost) {
        const quotient = BigNumber.from(amount).divide(unitCost);

        if (!quotient.isFinite() || quotient.lessOrEqual(0)) {
            return BigNumber.zero();
        }

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
        if (!requested.isFinite() || !requested.greater(0)) return 0;

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

        const count = availableCount.lessOrEqual(requestedCount)
            ? availableCount
            : requestedCount;

        if (!count.greater(0)) return 0;

        const resourceCost = recipe.resourceCost.multiply(count);
        const epReward = this.getReward(recipe, count);

        if (!epReward || !ResourceManager.consume(recipe.resourceId, resourceCost)) {
            return 0;
        }

        if (!EPManager.add(epReward)) {
            ResourceManager.add(recipe.resourceId, resourceCost);
            return 0;
        }

        eventBus.emit("converter:update", recipe);

        const numericCount = count.toNumber();
        return Number.isFinite(numericCount) ? numericCount : Number.MAX_VALUE;
    }

    convertByRate(id, rate) {
        const recipe = this.getRecipe(id);
        const rateValue = Number(rate);

        if (!recipe || !Number.isFinite(rateValue) || rateValue <= 0) {
            return 0;
        }

        const resource = ResourceManager.get(recipe.resourceId);
        if (!resource) return 0;

        const usable = resource.amount.multiply(rateValue);
        const countValue = usable.divide(recipe.resourceCost).toNumber();

        if (!Number.isFinite(countValue) && countValue !== Infinity) return 0;

        const count = Math.min(
            1000,
            Math.max(0, Math.floor(countValue))
        );

        if (!Number.isFinite(count) || count <= 0) return 0;

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

        if (!count.greater(0)) return 0;

        const resourceCost = recipe.resourceCost.multiply(count);
        const epReward = this.getReward(recipe, count);

        if (!epReward || !ResourceManager.consume(recipe.resourceId, resourceCost)) {
            return 0;
        }

        if (!EPManager.add(epReward)) {
            ResourceManager.add(recipe.resourceId, resourceCost);
            return 0;
        }

        eventBus.emit("converter:update", recipe);

        const numericCount = count.toNumber();
        return Number.isFinite(numericCount) ? numericCount : Number.MAX_VALUE;
    }
}

export default new Converter();
