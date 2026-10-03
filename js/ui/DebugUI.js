/**
 * World Creator
 * Debug UI
 */

import eventBus from "../core/eventBus.js";

import DebugManager from "../debug/Manager.js";

import SettingsManager from "../settings/Manager.js";

import BootProfiler from "../core/BootProfiler.js";

class DebugUI {

    constructor() {

        this.initialized = false;

    }

    initialize() {

        if (this.initialized) {

            return;

        }

        this.initialized = true;

        BootProfiler.setDebugMode(
            SettingsManager.isDebugMode()
        );

        this.updateVisibility();

        this.registerButtons();

        eventBus.on(

            "settings:update",

            () => {

                BootProfiler.setDebugMode(
                    SettingsManager.isDebugMode()
                );

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
        const actions = [
            ["debug-add-ep", "debug:add-ep"],
            ["debug-add-material", "debug:add-material"],
            ["debug-set-world-level", "debug:set-world-level"],
            ["debug-reset", "debug:reset"]
        ];

        actions.forEach(([id, action]) => {
            const element = this.getElement(id);
            if (element) element.dataset.action = action;
        });

        eventBus.on("action:debug:add-ep", () => {
            DebugManager.addEP(1000);
        });

        eventBus.on("action:debug:add-material", () => {
            DebugManager.addResource("material", 1000);
        });

        eventBus.on("action:debug:set-world-level", () => {
            const input = this.getElement("debug-world-level");
            if (input) DebugManager.setWorldLevel(input.value);
        });

        eventBus.on("action:debug:reset", () => {
            if (window.confirm("すべてのデータを削除しますか？")) {
                DebugManager.resetAll();
            }
        });
    }

}

export default new DebugUI();