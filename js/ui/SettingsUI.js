import eventBus from "../core/eventBus.js";
import SettingsManager from "../settings/Manager.js";
import WorldManager from "../world/Manager.js";
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
            if (!SettingsManager.set("tickSpeed", e.target.value)) this.render();
        });

        const a = this.getElement("settings-autosave");
        if (a) a.addEventListener("change", e => {
            if (SettingsManager.set("autoSaveInterval", e.target.value)) SaveManager.restartAutoSave();
            else this.render();
        });

        const d = this.getElement("settings-debug");
        if (d) d.addEventListener("change", e => SettingsManager.set("debugMode", e.target.checked));

        const speed = this.getElement("settings-debug-speed");
        if (speed) speed.addEventListener("change", e => {
            if (!SettingsManager.set("debugSpeedMultiplier", e.target.value)) this.render();
        });

        const s = this.getElement("settings-speedrun");
        if (s) s.addEventListener("change", e => SettingsManager.set("speedRunMode", e.target.checked));

        const maxed = this.getElement("settings-show-maxed-upgrades");
        if (maxed) maxed.addEventListener("change", e => SettingsManager.set("showMaxedUpgrades", e.target.checked));

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
        if (seedOutput) seedOutput.dataset.action = "settings:seed-output";

        const diagnosticRefresh = this.getElement("ep-diagnostic-refresh");
        if (diagnosticRefresh) diagnosticRefresh.addEventListener("click", () => this.renderDiagnostics());

        const diagnosticCopy = this.getElement("ep-diagnostic-copy");
        if (diagnosticCopy) diagnosticCopy.addEventListener("click", () => this.copyDiagnostics());
    }

    registerEvents() {
        eventBus.on("settings:update", () => this.render());
        eventBus.on("action:settings:seed-output", () => this.outputSeed());
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

    renderDiagnostics() {
        const output = this.getElement("ep-diagnostic-output");
        if (!output) return;
        try {
            const entries = JSON.parse(localStorage.getItem("world_creator_ep_diagnostics") || "[]");
            output.value = JSON.stringify({
                appVersion: document.documentElement.dataset.appVersion || "unknown",
                capturedAt: new Date().toISOString(),
                entries: Array.isArray(entries) ? entries : []
            }, null, 2);
        } catch (error) {
            output.value = "診断情報の読み込みに失敗: " + String(error?.message || error);
        }
    }

    async copyDiagnostics() {
        this.renderDiagnostics();
        const output = this.getElement("ep-diagnostic-output");
        if (!output) return;
        try {
            await navigator.clipboard.writeText(output.value);
            eventBus.emit("notification:show", { type: "info", message: "EP診断情報をコピーしました。" });
        } catch (error) {
            output.focus();
            output.select();
            eventBus.emit("notification:show", { type: "warning", message: "自動コピーできません。表示された診断情報を手動でコピーしてください。" });
        }
    }

    render() {
        const s = SettingsManager.getAll();
        const n = this.getElement("settings-number-format");
        const t = this.getElement("settings-tick-speed");
        const a = this.getElement("settings-autosave");
        const d = this.getElement("settings-debug");
        const speed = this.getElement("settings-debug-speed");
        const sr = this.getElement("settings-speedrun");
        const maxed = this.getElement("settings-show-maxed-upgrades");
        const l = this.getElement("settings-language");
        const seed = this.getElement("settings-seed");

        if (n) n.value = s.numberFormat;
        if (t) t.value = s.tickSpeed;
        if (a) a.value = s.autoSaveInterval;
        if (d) d.checked = Boolean(s.debugMode);
        if (speed) {
            speed.value = String(s.debugSpeedMultiplier);
            speed.disabled = !s.debugMode;
        }
        if (sr) sr.checked = Boolean(s.speedRunMode);
        if (maxed) maxed.checked = Boolean(s.showMaxedUpgrades);
        if (l) l.value = s.language;
        if (seed && document.activeElement !== seed) seed.value = s.seed || "";
        this.renderDiagnostics();
    }
}

export default new SettingsUI();
