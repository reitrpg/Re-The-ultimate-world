import eventBus from "./eventBus.js";

class InputManager {
    constructor() {
        this.initialized = false;
        this.lastTarget = null;
        this.lastEventTime = 0;
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;

        // Pointer Events cover mouse, touch, pen, iOS/iPadOS Safari,
        // Windows and Linux browsers, and Chromium-based WebViews.
        document.addEventListener("pointerup", event => this.dispatch(event), true);

        // Keyboard activation for buttons and custom controls.
        document.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            const target = this.resolveTarget(event);
            if (!target || target.disabled) return;
            this.dispatch(event);
        }, true);

        // Fallback for environments without usable Pointer Events.
        if (!("PointerEvent" in window)) {
            document.addEventListener("click", event => this.dispatch(event), true);
        }

        document.documentElement.style.setProperty("touch-action", "manipulation");
    }

    resolveTarget(event) {
        const selectors =
            "[data-action], [data-tab], [data-world-category], button, [role='button']";

        const path = typeof event.composedPath === "function"
            ? event.composedPath()
            : [];

        for (const node of path) {
            if (node && typeof node.closest === "function") {
                const target = node.closest(selectors);
                if (target) return target;
            }
        }

        const target = event.target;

        return target && typeof target.closest === "function"
            ? target.closest(selectors)
            : null;
    }

    dispatch(event) {
        const target = this.resolveTarget(event);

        if (!target || target.disabled) return false;

        // iOS/Android browsers may emit a compatibility click after pointerup.
        // Suppress only the matching target within a short physical-input window.
        const now = Date.now();
        if (target === this.lastTarget && now - this.lastEventTime < 350) {
            return false;
        }

        this.lastTarget = target;
        this.lastEventTime = now;

        const action = target.dataset?.action || null;
        const payload = {
            action,
            target,
            originalEvent: event,
            inputType: event.pointerType || event.type
        };

        eventBus.emit("input:pressed", payload);

        if (action) {
            eventBus.emit(action, payload);
        }

        return true;
    }
}

export default new InputManager();
