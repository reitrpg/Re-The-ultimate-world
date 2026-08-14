/**
 * World Creator
 * Tab UI
 */

import eventBus from "../core/eventBus.js";

class TabUI {

    constructor() {

        this.activeTab = "world";

        this.initialized = false;

    }

    initialize() {

        if (this.initialized) {

            return;

        }

        this.initialized = true;

        const buttons =
            document.querySelectorAll(
                "[data-tab]"
            );

        buttons.forEach(

            button => {

                button.addEventListener(

                    "click",

                    () => {

                        this.open(

                            button.dataset.tab

                        );

                    }

                );

            }

        );

        this.open(
            this.activeTab
        );

    }

    open(tabName) {

        const contents =
            document.querySelectorAll(
                ".tab-content"
            );

        contents.forEach(

            content => {

                content.hidden =

                    content.id !==
                    `${tabName}-tab`;

            }

        );

        const buttons =
            document.querySelectorAll(
                "[data-tab]"
            );

        buttons.forEach(

            button => {

                button.disabled =

                    button.dataset.tab ===
                    tabName;

            }

        );

        this.activeTab =
            tabName;

        eventBus.emit(

            "tab:change",

            tabName

        );

    }

    getActiveTab() {

        return this.activeTab;

    }

}

export default new TabUI();