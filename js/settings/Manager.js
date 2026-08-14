/**
 * World Creator
 * Settings Manager
 */

import eventBus from "../core/eventBus.js";

class SettingsManager {

    constructor() {

        this.defaultSettings = {

            numberFormat: "scientific",

            tickSpeed: 1000,

            autoSaveInterval: 30000,

            debugMode: false,

            speedRunMode: false,

            language: "ja",

            worldSeed: ""

        };

        this.settings = {

            ...this.defaultSettings

        };

    }

    get(key) {

        return this.settings[key];

    }

    getAll() {

        return {

            ...this.settings

        };

    }

    set(
        key,
        value
    ) {

        if (

            !(key in this.settings)

        ) {

            return false;

        }

        this.settings[key] = value;

        eventBus.emit(

            "settings:update",

            key,

            value

        );

        return true;

    }

    reset() {

        this.settings = {

            ...this.defaultSettings

        };

        eventBus.emit(

            "settings:reset"

        );

    }

    isDebugMode() {

        return this.settings.debugMode;

    }

    isSpeedRunMode() {

        return this.settings.speedRunMode;

    }

    getTickSpeed() {

        return this.settings.tickSpeed;

    }

    getAutoSaveInterval() {

        return this.settings.autoSaveInterval;

    }

    getNumberFormat() {

        return this.settings.numberFormat;

    }

    getLanguage() {

        return this.settings.language;

    }

    getWorldSeed() {

        return this.settings.worldSeed;

    }

    toJSON() {

        return {

            ...this.settings

        };

    }

    load(data) {

        if (!data) {

            return;

        }

        this.settings = {

            ...this.defaultSettings,

            ...data

        };

        eventBus.emit(

            "settings:load"

        );

    }

}

export default new SettingsManager();