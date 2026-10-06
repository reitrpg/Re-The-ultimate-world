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
        this.animationFrame = null;
        this.lastSyncTime = 0;
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;
        eventBus.on("resource:update", () => this.refresh());
        this.render();
        this.startDisplayLoop();
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

    startDisplayLoop() {
        if (this.animationFrame !== null) return;

        const updateDisplay = () => {
            if (!this.initialized) return;

            const elapsed = Math.max(0, (performance.now() - this.lastSyncTime) / 1000);

            ResourceManager.getAll().forEach(resource => {
                const selector = "[data-resource-value='" + CSS.escape(resource.id) + "']";
                const value = document.querySelector(selector);
                if (!value) return;

                let displayAmount = resource.amount;
                if (elapsed > 0 && resource.production && typeof resource.production.multiply === "function") {
                    displayAmount = resource.amount.add(resource.production.multiply(elapsed));
                }

                value.textContent = resource.name + ": " + Formatter.format(displayAmount);
            });

            this.animationFrame = window.requestAnimationFrame(updateDisplay);
        };

        this.lastSyncTime = performance.now();
        this.animationFrame = window.requestAnimationFrame(updateDisplay);
    }

    refresh() {
        this.lastSyncTime = performance.now();
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