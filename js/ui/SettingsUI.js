import eventBus from "../core/eventBus.js";
import SettingsManager from "../settings/Manager.js";
import WorldManager from "../world/Manager.js";
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
        const n = this.getElement("settings-number-format");
        if (n) n.addEventListener("change", e => SettingsManager.set("numberFormat", e.target.value));

        const t = this.getElement("settings-tick-speed");
        if (t) t.addEventListener("change", e => {
            if (!SettingsManager.set("tickSpeed", e.target.value)) {
                this.render();
            }
        });

        const a = this.getElement("settings-autosave");
        if (a) a.addEventListener("change", e => {
            if (SettingsManager.set("autoSaveInterval", e.target.value)) SaveManager.restartAutoSave();
            else this.render();
        });

        const d = this.getElement("settings-debug");
        if (d) d.addEventListener("change", e => SettingsManager.set("debugMode", e.target.checked));

        const s = this.getElement("settings-speedrun");
        if (s) s.addEventListener("change", e => SettingsManager.set("speedRunMode", e.target.checked));

        const l = this.getElement("settings-language");
        if (l) l.addEventListener("change", e => {
            if (!SettingsManager.set("language", e.target.value)) {
                this.render();
                return;
            }
            WorldManager.refreshGeneratedNames(SettingsManager.get("language"));
            SaveManager.save();
        });

        const seed = this.getElement("settings-seed");
        if (seed) seed.addEventListener("change", e => SettingsManager.set("seed", e.target.value));

        const seedOutput = this.getElement("settings-seed-output");
        if (seedOutput) {
            seedOutput.dataset.action = "settings:seed-output";
        }
    }

    registerEvents() {
        eventBus.on("settings:update", () => this.render());

        eventBus.on("action:settings:seed-output", () => {
            this.outputSeed();
        });
    }

    async outputSeed() {
        const world = WorldManager.getActive();
        if (!world) return;

        const value = world.seed;
        const input = this.getElement("settings-seed");

        if (input) input.value = value;

        SettingsManager.set("seed", value);

        try {
            await navigator.clipboard?.writeText(value);
        } catch (error) {
            console.warn("Seed clipboard output failed:", error);
        }

        eventBus.emit("notification:show", {
            type: "info",
            message: "現在の世界のシード値を出力しました。"
        });
    }

    render() {
        const s = SettingsManager.getAll();

        const n = this.getElement("settings-number-format");
        const t = this.getElement("settings-tick-speed");
        const a = this.getElement("settings-autosave");
        const d = this.getElement("settings-debug");
        const sr = this.getElement("settings-speedrun");
        const l = this.getElement("settings-language");
        const seed = this.getElement("settings-seed");

        if (n) n.value = s.numberFormat;
        if (t) t.value = s.tickSpeed;
        if (a) a.value = s.autoSaveInterval;
        if (d) d.checked = Boolean(s.debugMode);
        if (sr) sr.checked = Boolean(s.speedRunMode);
        if (l) l.value = s.language;
        if (seed && document.activeElement !== seed) seed.value = s.seed || "";
    }
}

export default new SettingsUI();
