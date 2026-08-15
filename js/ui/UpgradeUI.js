/**
 * World Creator
 * Upgrade UI
 */

import UpgradeManager from "../upgrades/Manager.js";

import Formatter from "../utils/Formatter.js";

import eventBus from "../core/eventBus.js";

class UpgradeUI {

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

            "upgrade:update",

            () => {

                this.render();

            }

        );

    }

    createUpgradeElement(
        upgrade
    ) {

        const item =

            document.createElement(
                "div"
            );

        item.className =
            "upgrade-item";

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

            }

        );

        item.innerHTML =

            `
            <h3>${upgrade.name}</h3>
            <p>Lv : ${upgrade.level}</p>
            <p>倍率 : ×${upgrade.getMultiplier()}</p>
            <p>コスト : ${Formatter.format(upgrade.getCost())} EP</p>
            `;

        item.appendChild(
            button
        );

        return item;

    }

    render() {

        const container =

            document.getElementById(
                "upgrade-list"
            );

        if (!container) {

            return;

        }

        container.innerHTML = "";

        UpgradeManager
            .getAll()
            .forEach(

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