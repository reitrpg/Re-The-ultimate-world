/**
 * World Creator
 * Upgrade UI
 */

import eventBus from "../core/eventBus.js";
import UpgradeManager from "../upgrades/Manager.js";

class UpgradeUI {

    constructor() {

        this.initialized = false;

    }

    initialize() {

        if (this.initialized) {

            return;

        }

        this.initialized = true;

        eventBus.on(
            "upgrade:update",
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
            "upgrade-list"
        );

    }

    createUpgradeElement(
        upgrade
    ) {

        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.className =
            "upgrade-item";

        const title =
            document.createElement(
                "h3"
            );

        title.textContent =
            upgrade.name;

        const level =
            document.createElement(
                "p"
            );

        level.textContent =
            `Lv.${upgrade.level}`;

        const cost =
            document.createElement(
                "p"
            );

        cost.textContent =
            `Cost: ${UpgradeManager
                .getCost(
                    upgrade.id
                )
                .toString()} EP`;

        const button =
            document.createElement(
                "button"
            );

        button.textContent =
            "強化";

        button.addEventListener(
            "click",
            () => {

                UpgradeManager.buy(
                    upgrade.id
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

        const upgrades =
            UpgradeManager.getAll();

        upgrades.forEach(
            upgrade => {

                container.appendChild(

                    this.createUpgradeElement(
                        upgrade
                    )

                );

            }
        );

    }

}

export default new UpgradeUI();