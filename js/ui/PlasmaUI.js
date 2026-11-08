import eventBus from "../core/eventBus.js";
import PlasmaManager from "../plasma/Manager.js";
import Formatter from "../utils/Formatter.js";
import TabUI from "./TabUI.js";

class PlasmaUI {
    constructor() {
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;
        eventBus.on("plasma:update", () => this.render());
        eventBus.on("phase:transition:complete", () => {
            this.render();
            TabUI.open("plasma");
        });
        this.render();
    }

    render() {
        const button = document.querySelector("[data-tab='plasma']");
        const panel = document.querySelector("[data-tab-panel='plasma']");
        const value = document.getElementById("plasma-energy-value");
        const unlocked = PlasmaManager.isUnlocked();

        if (button) button.hidden = !unlocked;
        if (panel) panel.hidden = !unlocked;
        if (value) value.textContent = Formatter.format(PlasmaManager.getEnergy());

        const status = document.getElementById("plasma-status");
        if (status && unlocked) status.textContent = "世界研究システム再構築完了";
    }
}

export default new PlasmaUI();
