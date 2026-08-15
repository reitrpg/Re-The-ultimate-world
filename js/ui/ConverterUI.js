/**
 * World Creator
 * Converter UI
 */

import Converter from "../converter/Converter.js";

import Formatter from "../utils/Formatter.js";

import eventBus from "../core/eventBus.js";

class ConverterUI {

    constructor() {

        this.initialized = false;

    }

    initialize() {

        if (this.initialized) {

            return;

        }

        this.initialized = true;

        this.registerEvents();

        this.render();

    }

    registerEvents() {

        eventBus.on(

            "converter:update",

            () => {

                this.render();

            }

        );

        eventBus.on(

            "resource:update",

            () => {

                this.render();

            }

        );

    }

    createConverterElement(
        recipe
    ) {

        const item =

            document.createElement(
                "div"
            );

        item.className =
            "converter-item";

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
            "全変換";

        convertAllButton.addEventListener(

            "click",

            () => {

                Converter.convertAll(
                    recipe.id
                );

            }

        );

        item.innerHTML =

            `
            <h3>${recipe.name}</h3>
            <p>
                ${Formatter.format(recipe.resourceCost)}
                →
                ${Formatter.format(recipe.epReward)} EP
            </p>
            `;

        item.appendChild(
            convertButton
        );

        item.appendChild(
            convertAllButton
        );

        return item;

    }

    render() {

        const container =

            document.getElementById(
                "converter-list"
            );

        if (!container) {

            return;

        }

        container.innerHTML = "";

        Converter.getRecipes().forEach(

            recipe => {

                container.appendChild(

                    this.createConverterElement(
                        recipe
                    )

                );

            }

        );

    }

}

export default new ConverterUI();