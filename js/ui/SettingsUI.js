/**
 * World Creator
 * Settings UI
 */

import eventBus from "../core/eventBus.js";

import SettingsManager from "../settings/Manager.js";

import Game from "../core/game.js";

class SettingsUI {

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

        const numberFormat =

            document.getElementById(
                "settings-number-format"
            );

        if (numberFormat) {

            numberFormat.addEventListener(

                "change",

                event => {

                    SettingsManager.set(

                        "numberFormat",

                        event.target.value

                    );

                }

            );

        }

        const tickSpeed =

            document.getElementById(
                "settings-tick-speed"
            );

        if (tickSpeed) {

            tickSpeed.addEventListener(

                "change",

                event => {

                    SettingsManager.set(

                        "tickSpeed",

                        Number(
                            event.target.value
                        )

                    );

                    Game.restart();

                }

            );

        }

        const autoSave =

            document.getElementById(
                "settings-autosave"
            );

        if (autoSave) {

            autoSave.addEventListener(

                "change",

                event => {

                    SettingsManager.set(

                        "autoSaveInterval",

                        Number(
                            event.target.value
                        )

                    );

                }

            );

        }

        const debugMode =

            document.getElementById(
                "settings-debug"
            );

        if (debugMode) {

            debugMode.addEventListener(

                "change",

                event => {

                    SettingsManager.set(

                        "debugMode",

                        event.target.checked

                    );

                }

            );

        }

        const speedRunMode =

            document.getElementById(
                "settings-speedrun"
            );

        if (speedRunMode) {

            speedRunMode.addEventListener(

                "change",

                event => {

                    SettingsManager.set(

                        "speedRunMode",

                        event.target.checked

                    );

                }

            );

        }

        const language =

            document.getElementById(
                "settings-language"
            );

        if (language) {

            language.addEventListener(

                "change",

                event => {

                    SettingsManager.set(

                        "language",

                        event.target.value

                    );

                }

            );

        }

        eventBus.on(

            "settings:update",

            () => {

                this.render();

            }

        );

    }

    render() {

        const settings =

            SettingsManager.getAll();

        const numberFormat =

            document.getElementById(
                "settings-number-format"
            );

        const tickSpeed =

            document.getElementById(
                "settings-tick-speed"
            );

        const autoSave =

            document.getElementById(
                "settings-autosave"
            );

        const debugMode =

            document.getElementById(
                "settings-debug"
            );

        const speedRunMode =

            document.getElementById(
                "settings-speedrun"
            );

        const language =

            document.getElementById(
                "settings-language"
            );

        if (numberFormat) {

            numberFormat.value =
                settings.numberFormat;

        }

        if (tickSpeed) {

            tickSpeed.value =
                settings.tickSpeed;

        }

        if (autoSave) {

            autoSave.value =
                settings.autoSaveInterval;

        }

        if (debugMode) {

            debugMode.checked =
                settings.debugMode;

        }

        if (speedRunMode) {

            speedRunMode.checked =
                settings.speedRunMode;

        }

        if (language) {

            language.value =
                settings.language;

        }

    }

}

export default new SettingsUI();