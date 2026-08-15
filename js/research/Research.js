/**
 * World Creator
 * Research UI
 */

import ResearchManager from "../research/Manager.js";

import Formatter from "../utils/Formatter.js";

import eventBus from "../core/eventBus.js";

class ResearchUI {

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

            "research:update",

            () => {

                this.render();

            }

        );

    }

    createResearchElement(
        research
    ) {

        const item =

            document.createElement(
                "div"
            );

        item.className =
            "research-item";

        const button =

            document.createElement(
                "button"
            );

        button.textContent =
            "研究";

        button.addEventListener(

            "click",

            () => {

                ResearchManager.buy(
                    research.id
                );

            }

        );

        item.innerHTML =

            `
            <h3>${research.name}</h3>
            <p>Lv : ${research.level}</p>
            <p>倍率 : ×${research.getMultiplier()}</p>
            <p>コスト : ${Formatter.format(research.getCost())} EP</p>
            `;

        item.appendChild(
            button
        );

        return item;

    }

    render() {

        const container =

            document.getElementById(
                "research-list"
            );

        if (!container) {

            return;

        }

        container.innerHTML = "";

        ResearchManager
            .getAll()
            .forEach(

                research => {

                    container.appendChild(

                        this.createResearchElement(
                            research
                        )

                    );

                }

            );

    }

}

export default new ResearchUI();