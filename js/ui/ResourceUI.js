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
        eventBus.on("resource:update", () => this.refresh());
        this.render();
    }

    render() {
        const container = document.getElementById("resource-list");
        if (!container) return;

        container.innerHTML = "";

        ResourceManager.getAll().forEach(resource => {
            const item = document.createElement("div");
            item.className = "resource-item";
            item.dataset.resourceId = resource.id;

            const value = document.createElement("span");
            value.dataset.resourceValue = resource.id;
            item.appendChild(value);

            container.appendChild(item);
        });

        this.refresh();
    }

    refresh() {
        ResourceManager.getAll().forEach(resource => {
            const value = document.querySelector(
                "[data-resource-value='" + CSS.escape(resource.id) + "']"
            );

            if (value) {
                value.textContent =
                    resource.name + ": " + Formatter.format(resource.amount);
            }
        });
    }
}

export default new ResourceUI();