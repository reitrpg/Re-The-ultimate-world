/**
 * World Creator
 * Settings UI
 */

import eventBus from "../core/eventBus.js";
import SettingsManager from "../settings/Manager.js";
import Game from "../core/game.js";
import SaveManager from "../core/save.js";

class SettingsUI {
    constructor() {
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        this.initialized = true;
        this.registerControls();
        this.registerEvents();
        this.render();
    }

    getElement(id) {
        return document.getElementById(id);
    }

    registerControls() {
        const numberFormat = this.getElement("settings-number-format");
        if (numberFormat) {
            numberFormat.addEventListener("change", event => {
                SettingsManager.set("numberFormat", event.target.value);
            });
        }

        const tickSpeed = this.getElement("settings-tick-speed");
        if (tickSpeed) {
            tickSpeed.addEventListener("change", event => {
                if (!SettingsManager.set("tickSpeed", event.target.value)) {
                    this.render();
                    return;
                }
                Game.restart();
            });
        }

        const autoSave = this.getElement("settings-autosave");
        if (autoSave) {
            autoSave.addEventListener("change", event => {
                if (!SettingsManager.set("autoSaveInterval", event.target.value)) {
                    this.render();
                    return;
                }
                SaveManager.restartAutoSave();
            });
        }

        const debugMode = this.getElement("settings-debug");
        if (debugMode) {
            debugMode.addEventListener("change", event => {
                SettingsManager.set("debugMode", event.target.checked);
            });
        }

        const speedRunMode = this.getElement("settings-speedrun");
        if (speedRunMode) {
            speedRunMode.addEventListener("change", event => {
                SettingsManager.set("speedRunMode", event.target.checked);
            });
        }

        const language = this.getElement("settings-language");
        if (language) {
            language.addEventListener("change", event => {
                SettingsManager.set("language", event.target.value);
            });
        }
    }

    registerEvents() {
        eventBus.on("settings:update", () => this.render());
    }

    render() {
        const settings = SettingsManager.getAll();

        const numberFormat = this.getElement("settings-number-format");
        const tickSpeed = this.getElement("settings-tick-speed");
        const autoSave = this.getElement("settings-autosave");
        const debugMode = this.getElement("settings-debug");
        const speedRunMode = this.getElement("settings-speedrun");
        const language = this.getElement("settings-language");

        if (numberFormat) numberFormat.value = settings.numberFormat;
        if (tickSpeed) tickSpeed.value = settings.tickSpeed;
        if (autoSave) autoSave.value = settings.autoSaveInterval;
        if (debugMode) debugMode.checked = Boolean(settings.debugMode);
        if (speedRunMode) speedRunMode.checked = Boolean(settings.speedRunMode);
        if (language) language.value = settings.language;
    }
}

export default new SettingsUI();
