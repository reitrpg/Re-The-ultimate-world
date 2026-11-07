import EPManager from "../ep/Manager.js";
import Formatter from "../utils/Formatter.js";
import eventBus from "../core/eventBus.js";

class EPUI {
    constructor() {
        this.initialized = false;
        this.renderCount = 0;
        this.lastRenderError = null;
    }

    initialize() {
        if (this.initialized) return;

        this.initialized = true;
        eventBus.on("ep:update", () => this.render());
        this.render();
    }

    render() {
        const ep = EPManager.get();
        const element = document.getElementById("ep-value");

        if (!element) {
            console.warn("[EPUI] #ep-value element not found.");
            return;
        }

        try {
            const internalJSON = ep && typeof ep.toJSON === "function"
                ? ep.toJSON()
                : ep;
            const internalString = ep && typeof ep.toString === "function"
                ? ep.toString()
                : String(ep);
            const displayValue = Formatter.format(ep);

            element.textContent = displayValue;
            this.renderCount += 1;
            this.lastRenderError = null;

            console.debug("[EPUI] EP display updated", {
                renderCount: this.renderCount,
                internalJSON,
                internalString,
                displayValue
            });
        } catch (error) {
            this.lastRenderError = error;
            console.error("[EPUI] EP display update failed", {
                error,
                internalValue: ep,
                internalJSON: ep && typeof ep.toJSON === "function" ? ep.toJSON() : null,
                internalString: ep && typeof ep.toString === "function" ? ep.toString() : String(ep),
                renderCount: this.renderCount
            });
        }
    }
}

export default new EPUI();
