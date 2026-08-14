/**
 * World Creator
 * Converter UI
 */

import eventBus from "../core/eventBus.js";

import Converter from "../converter/Converter.js";

class ConverterUI {

    constructor() {

        this.initialized = false;

    }

    initialize() {

        if (this.initialized) {

            return;

        }

        this.initialized = true;

        eventBus.on(

            "resource:update",

            () => {

                this.render();

            }

        );

        eventBus.on(

            "ep:update",

            () => {

                this.render();

            }

        );

        this.render();

    }

    getContainer() {

        return document.getElementById(
            "converter-list"
        );

    }

    createRecipe(recipe) {

        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.className =
            "converter-item";

        const title =
            document.createElement(
                "h3"
            );

        title.textContent =
            recipe.name;

        const cost =
            document.createElement(
                "p"
            );

        cost.textContent =

            `必要素材: ${recipe.resourceCost.toString()}`;

        const reward =
            document.createElement(
                "p"
            );

        reward.textContent =

            `獲得EP: ${recipe.epReward.toString()}`;

        const convertButton =
            document.createElement(
                "button"
            );

        convertButton.textContent =
            "変換";

        convertButton.addEventListener(

            "click",

            () => {

                Converter.convert(
                    recipe.id
                );

            }

        );

        const convertAllButton =
            document.createElement(
                "button"
            );

        convertAllButton.textContent =
            "一括変換";

        convertAllButton.addEventListener(

            "click",

            () => {

                Converter.convertAll(
                    recipe.id
                );

            }

        );

        wrapper.appendChild(
            title
        );

        wrapper.appendChild(
            cost
        );

        wrapper.appendChild(
            reward
        );

        wrapper.appendChild(
            convertButton
        );

        wrapper.appendChild(
            convertAllButton
        );

        return wrapper;

    }

    render() {

        const container =
            this.getContainer();

        if (!container) {

            return;

        }

        container.innerHTML =
            "";

        const recipes =
            Converter.getRecipes();

        recipes.forEach(

            recipe => {

                container.appendChild(

                    this.createRecipe(
                        recipe
                    )

                );

            }

        );

    }

}

export default new ConverterUI();