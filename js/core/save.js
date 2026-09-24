/**
 * World Creator
 * Save Manager
 */

import eventBus from "./eventBus.js";

import WorldManager from "../world/Manager.js";
import UnlockManager from "../world/UnlockManager.js";
import ResourceManager from "../resource/Manager.js";
import EPManager from "../ep/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
import RebirthManager from "../rebirth/Manager.js";
import SettingsManager from "../settings/Manager.js";

class SaveManager {
    constructor() {
        this.key = "world_creator_save";
        this.version = 3;
        this.autoSaveTimer = null;
    }

    createSaveData() {
        return {
            version: this.version,
            timestamp: Date.now(),
            worlds: WorldManager.toJSON(),
            worldUnlock: UnlockManager.toJSON(),
            resources: ResourceManager.toJSON(),
            ep: EPManager.toJSON(),
            research: ResearchManager.toJSON(),
            upgrades: UpgradeManager.toJSON(),
            rebirth: RebirthManager.toJSON(),
            settings: SettingsManager.toJSON()
        };
    }

    save() {
        try {
            localStorage.setItem(
                this.key,
                JSON.stringify(this.createSaveData())
            );
            eventBus.emit("save:success");
            return true;
        } catch (error) {
            console.error(error);
            eventBus.emit("save:error", error);
            return false;
        }
    }

    load() {
        try {
            const raw = localStorage.getItem(this.key);
            if (!raw) return false;

            const data = JSON.parse(raw);

            if (!data || typeof data !== "object") {
                throw new Error("セーブデータの形式が不正です");
            }

            WorldManager.load(data.worlds);
            UnlockManager.load(data.worldUnlock);
            ResourceManager.load(data.resources);
            EPManager.load(data.ep);
            ResearchManager.load(data.research);
            UpgradeManager.load(data.upgrades);
            RebirthManager.load(data.rebirth);
            SettingsManager.load(data.settings);

            if (WorldManager.getCount() === 0) {
                WorldManager.create(Date.now().toString());
            }

            if (!ResourceManager.exists("material")) {
                ResourceManager.createDefaultResources();
            }

            eventBus.emit("load:success");
            return true;
        } catch (error) {
            console.error(error);
            eventBus.emit("load:error", error);

            // Corrupt saves must not prevent the game from starting.
            localStorage.removeItem(this.key);
            return false;
        }
    }

    clear() {
        this.stopAutoSave();
        localStorage.removeItem(this.key);
        localStorage.removeItem("world_creator_last_time");
        eventBus.emit("save:clear");
    }

    startAutoSave() {
        this.stopAutoSave();

        const interval = SettingsManager.getAutoSaveInterval();
        if (!Number.isFinite(interval) || interval <= 0) {
            return;
        }

        this.autoSaveTimer = setInterval(
            () => this.save(),
            interval
        );
    }

    stopAutoSave() {
        if (!this.autoSaveTimer) return;
        clearInterval(this.autoSaveTimer);
        this.autoSaveTimer = null;
    }

    restartAutoSave() {
        this.startAutoSave();
    }
}

export default new SaveManager();
