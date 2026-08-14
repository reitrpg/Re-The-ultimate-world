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

            id: "material_to_ep",

            name: "素材 → EP",

            resourceId: "material",

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

        let count = 0;

        while (

            this.canConvert(id)

        ) {

            this.convert(id);

            count++;

        }

        return count;

    }

}

export default new Converter();