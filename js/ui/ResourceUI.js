/**
 * World Creator
 * Resource UI
 */

import ResourceManager from "../resource/Manager.js";
import Formatter from "../utils/Formatter.js";
import eventBus from "../core/eventBus.js";

class ResourceUI {
    constructor() {
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;
        eventBus.on("resource:update", () => this.render());
        this.render();
    }

    render() {
        const container = document.getElementById("resource-list");
        if (!container) return;

        container.innerHTML = "";

        ResourceManager.getAll().forEach(resource => {
            const item = document.createElement("div");
            item.className = "resource-item";
            item.textContent =
                resource.name + ": " + Formatter.format(resource.amount);
            container.appendChild(item);
        });
    }
}

export default new ResourceUI();
