/**
 * World Creator
 * Debug UI
 */

import eventBus from "../core/eventBus.js";

import DebugManager from "../debug/Manager.js";

import SettingsManager from "../settings/Manager.js";

class DebugUI {

    constructor() {

        this.initialized = false;

    }

    initialize() {

        if (this.initialized) {

            return;

        }

        this.initialized = true;

        this.updateVisibility();

        this.registerButtons();

        eventBus.on(

            "settings:update",

            () => {

                this.updateVisibility();

            }

        );

    }

    getElement(id) {

        return document.getElementById(id);

    }

    updateVisibility() {

        const container =

            this.getElement(
                "debug-panel"
            );

        if (!container) {

            return;

        }

        container.hidden =

            !SettingsManager.isDebugMode();

    }

    registerButtons() {

        const addEP =

            this.getElement(
                "debug-add-ep"
            );

        if (addEP) {

            addEP.addEventListener(

                "click",

                () => {

                    DebugManager.addEP(
                        1000
                    );

                }

            );

        }

        const addMaterial =

            this.getElement(
                "debug-add-material"
            );

        if (addMaterial) {

            addMaterial.addEventListener(

                "click",

                () => {

                    DebugManager.addResource(
                        "material",
                        1000
                    );

                }

            );

        }

        const setWorldLevel =

            this.getElement(
                "debug-set-world-level"
            );

        if (setWorldLevel) {

            setWorldLevel.addEventListener(

                "click",

                () => {

                    const input =

                        this.getElement(
                            "debug-world-level"
                        );

                    if (!input) {

                        return;

                    }

                    DebugManager.setWorldLevel(
                        input.value
                    );

                }

            );

        }

        const resetButton =

            this.getElement(
                "debug-reset"
            );

        if (resetButton) {

            resetButton.addEventListener(

                "click",

                () => {

                    const confirmed =

                        window.confirm(
                            "すべてのデータを削除しますか？"
                        );

                    if (!confirmed) {

                        return;

                    }

                    DebugManager.resetAll();

                }

            );

        }

    }

}

export default new DebugUI();