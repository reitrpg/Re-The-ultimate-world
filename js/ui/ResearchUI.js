/**
 * World Creator
 * Research UI
 */

import eventBus from "../core/eventBus.js";

import ResearchManager from "../research/Manager.js";

class ResearchUI {

    constructor() {

        this.initialized = false;

    }

    initialize() {

        if (this.initialized) {

            return;

        }

        this.initialized = true;

        eventBus.on(

            "research:update",

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
            "research-list"
        );

    }

    createResearchElement(
        research
    ) {

        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.className =
            "research-item";

        const title =
            document.createElement(
                "h3"
            );

        title.textContent =
            research.name;

        const level =
            document.createElement(
                "p"
            );

        level.textContent =
            `Lv.${research.level}`;

        const cost =
            document.createElement(
                "p"
            );

        cost.textContent =
            `Cost: ${ResearchManager
                .getCost(
                    research.id
                )
                .toString()} EP`;

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

                this.render();

            }

        );

        wrapper.appendChild(
            title
        );

        wrapper.appendChild(
            level
        );

        wrapper.appendChild(
            cost
        );

        wrapper.appendChild(
            button
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

        const researches =
            ResearchManager.getAll();

        researches.forEach(

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