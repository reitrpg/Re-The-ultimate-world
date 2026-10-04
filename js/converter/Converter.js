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

    convertByAmount(id, amount) {
        const recipe = this.getRecipe(id);
        if (!recipe) return 0;

        const requested = BigNumber.from(amount);
        if (requested.lessOrEqual(0)) return 0;

        const resource = ResourceManager.get(recipe.resourceId);
        if (!resource) return 0;

        const availableCount = resource.amount
            .divide(recipe.resourceCost)
            .toNumber();
        const requestedCount = requested
            .divide(recipe.resourceCost)
            .toNumber();

        if (!Number.isFinite(availableCount) || !Number.isFinite(requestedCount)) {
            return this.convertAll(id);
        }

        const count = Math.min(
            1000000,
            Math.max(0, Math.floor(Math.min(availableCount, requestedCount)))
        );

        if (count <= 0) return 0;

        const resourceCost = recipe.resourceCost.multiply(count);
        const epReward = recipe.epReward
            .multiply(count)
            .multiply(AchievementManager.getTotalMultiplier());

        if (!ResourceManager.consume(recipe.resourceId, resourceCost)) return 0;

        EPManager.add(epReward);
        eventBus.emit("converter:update", recipe);
        return count;
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
        if (!resource || !this.canConvert(id)) return 0;

        const rawCount = resource.amount
            .divide(recipe.resourceCost)
            .toNumber();

        if (!Number.isFinite(rawCount)) {
            return this.convertByAmount(id, resource.amount);
        }

        const count = Math.min(
            1000000,
            Math.max(0, Math.floor(rawCount))
        );

        if (count <= 0) return 0;

        return this.convertByAmount(
            id,
            recipe.resourceCost.multiply(count)
        );
    }
}

export default new Converter();
