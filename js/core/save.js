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

        this.key =
            "world_creator_save";

        this.version = 2;

        this.autoSaveTimer =
            null;

    }

    createSaveData() {

        return {

            version:
                this.version,

            timestamp:
                Date.now(),

            worlds:
                WorldManager.toJSON(),

            worldUnlock:
                UnlockManager.toJSON(),

            resources:
                ResourceManager.toJSON(),

            ep:
                EPManager.toJSON(),

            research:
                ResearchManager.toJSON(),

            upgrades:
                UpgradeManager.toJSON(),

            rebirth:
                RebirthManager.toJSON(),

            settings:
                SettingsManager.toJSON()

        };

    }

    save() {

        try {

           