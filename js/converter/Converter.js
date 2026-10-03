/**
 * World Creator
 * Converter
 */

import ResourceManager from "../resource/Manager.js";
import EPManager from "../ep/Manager.js";
import BigNumber from "../number/BigNumber.js";
import eventBus from "../core/eventBus.js";

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

    }

    addRecipe(recipe) {

        this.recipes.set(

            recipe.id,

            {

                id: recipe.id,

                name: recipe.name,

                resourceId: recipe.resourceId,

                resourceCost: BigNumber.from(
                    recipe.resourceCost
                ),

                epReward: BigNumber.from(
                    recipe.epReward
                )

            }

        );

    }

    getRecipe(id) {

        return this.recipes.get(id);

    }

    getRecipes() {

        return Array.from(

            this.recipes.values()

        );

    }

    canConvert(id) {

        const recipe =
            this.getRecipe(id);

        if (!recipe) {

            return false;

        }

        return ResourceManager.has(

            recipe.resourceId,

            recipe.resourceCost

        );

    }

    convert(id) {

        const recipe =
            this.getRecipe(id);

        if (!recipe) {

            return false;

        }

        if (!this.canConvert(id)) {

            return false;

        }

        ResourceManager.consume(

            recipe.resourceId,

            recipe.resourceCost

        );

        EPManager.add(

            recipe.epReward

        );

        eventBus.emit(

            "converter:update",

            recipe

        );

        return true;

    }

    convertAll(id) {
        const recipe = this.getRecipe(id);
        if (!recipe) return 0;

        const resource = ResourceManager.get(recipe.resourceId);
        if (!resource || !this.canConvert(id)) return 0;

        const rawCount = resource.amount
            .divide(recipe.resourceCost)
            .toNumber();

        const count = Math.min(
            1000,
            Math.max(0, Math.floor(rawCount))
        );

        if (count <= 0) return 0;

        const resourceCost = recipe.resourceCost.multiply(count);
        const epReward = recipe.epReward.multiply(count);

        if (!ResourceManager.consume(recipe.resourceId, resourceCost)) {
            return 0;
        }

        EPManager.add(epReward);
        eventBus.emit("converter:update", recipe);

        return count;
    }

}

export default new Converter();