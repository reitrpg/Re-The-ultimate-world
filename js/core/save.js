/**
 * World Creator
 * Save Manager
 */

import eventBus from "./eventBus.js";

import WorldManager from "../world/Manager.js";
import ResourceManager from "../resource/Manager.js";
import EPManager from "../ep/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
import SettingsManager from "../settings/Manager.js";

class SaveManager {

    constructor() {

        this.key =
            "world_creator_save";

        this.version = 1;

        this.autoSaveTimer = null;

    }

    createSaveData() {

        return {

            version:
                this.version,

            timestamp:
                Date.now(),

            worlds:
                WorldManager.toJSON(),

            resources:
                ResourceManager.toJSON(),

            ep:
                EPManager.toJSON(),

            research:
                ResearchManager.toJSON(),

            upgrades:
                UpgradeManager.toJSON(),

            settings:
                SettingsManager.toJSON()

        };

    }

    save() {

        try {

            const data =
                this.createSaveData();

            localStorage.setItem(

                this.key,

                JSON.stringify(data)

            );

            eventBus.emit(
                "save:success"
            );

            return true;

        } catch (error) {

            console.error(error);

            eventBus.emit(
                "save:error",
                error
            );

            return false;

        }

    }

    load() {

        try {

            const raw =
                localStorage.getItem(
                    this.key
                );

            if (!raw) {

                return false;

            }

            const data =
                JSON.parse(raw);

            WorldManager.load(
                data.worlds
            );

            ResourceManager.load(
                data.resources
            );

            EPManager.load(
                data.ep
            );

            ResearchManager.load(
                data.research
            );

            UpgradeManager.load(
                data.upgrades
            );

            SettingsManager.load(
                data.settings
            );

            eventBus.emit(
                "load:success"
            );

            return true;

        } catch (error) {

            console.error(error);

            eventBus.emit(
                "load:error",
                error
            );

            return false;

        }

    }

    clear() {

        localStorage.removeItem(
            this.key
        );

        eventBus.emit(
            "save:clear"
        );

    }

    startAutoSave() {

        const interval =
            SettingsManager.getAutoSaveInterval();

        if (
            this.autoSaveTimer
        ) {

            clearInterval(
                this.autoSaveTimer
            );

        }

        this.autoSaveTimer =
            setInterval(

                () => {

                    this.save();

                },

                interval

            );

    }

    stopAutoSave() {

        if (
            !this.autoSaveTimer
        ) {

            return;

        }

        clearInterval(
            this.autoSaveTimer
        );

        this.autoSaveTimer =
            null;

    }

}

export default new SaveManager();