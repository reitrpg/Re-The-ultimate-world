/**
 * World Creator
 * Settings Manager
 */

import eventBus from "../core/eventBus.js";

class SettingsManager {

    constructor() {

        this.settings = {

            numberFormat:
                "scientific",

            tickSpeed:
                1000,

            autoSaveInterval:
                30000,

            debugMode:
                false,

            speedRunMode:
                false,

            language:
                "ja"

        };

    }

    get(key) {

        return this.settings[key];

    }

    set(
        key,
        value
    ) {

        if (

            !Object.prototype.hasOwnProperty.call(

                this.settings,

                key

            )

        ) {

            return false;

        }

        this.settings[key] =
            value;

        eventBus.emit(

            "settings:update"

        );

        return true;

    }

    getTickSpeed() {

        return Number(

            this.settings.tickSpeed

        );

    }

    getAutoSaveInterval() {

        return Number(

            this.settings.autoSaveInterval

        );

    }

    isDebugMode() {

        return Boolean(

            this.settings.debugMode

        );

    }

    isSpeedRunMode() {

        return Boolean(

            this.settings.speedRunMode

        );

    }

    reset() {

        this.settings = {

            numberFormat:
                "scientific",

            tickSpeed:
                1000,

            autoSaveInterval:
                30000,

            debugMode:
                false,

            speedRunMode:
                false,

            language:
                "ja"

        };

        eventBus.emit(

            "settings:update"

        );

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

            ...this.settings,

            ...data

        };

    }

}

export default new SettingsManager();