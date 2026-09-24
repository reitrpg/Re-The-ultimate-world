import RebirthManager from "../rebirth/Manager.js";
import Formatter from "../utils/Formatter.js";
import WorldManager from "../world/Manager.js";
import eventBus from "../core/eventBus.js";

class RebirthUI {
    constructor() { this.initialized = false; }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;
        eventBus.on("rebirth:update", () => this.render());
        eventBus.on("world:update", () => this.render());
        this.registerButton();
        this.render();
    }

    registerButton() {
        const button = document.getElementById("rebirth-button");
        if (!button) return;
        button.addEventListener("click", () => RebirthManager.rebirth());
    }

    render() {
        const world = WorldManager.getActive();
        const name = document.getElementById("rebirth-world-name");
        const count = document.getElementById("rebirth-count");
        const multiplier = document.getElementById("rebirth-multiplier");
        const sacrifice = document.getElementById("rebirth-sacrifice-multiplier");
        const exp = document.getElementById("rebirth-world-exp");
        const button = document.getElementById("rebirth-button");

        if (name) name.textContent = world?.name || "-";
        if (count) count.textContent = RebirthManager.getCount();
        if (multiplier) multiplier.textContent = Formatter.format(RebirthManager.getMultiplier());
        if (sacrifice) sacrifice.textContent = Formatter.format(RebirthManager.getSacrificeMultiplier());
        if (exp) exp.textContent = Formatter.format(world?.exp || 0);
        if (button) button.disabled = !RebirthManager.canRebirth();
    }
}

export default new RebirthUI();
