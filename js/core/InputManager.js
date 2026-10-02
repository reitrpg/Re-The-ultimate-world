import eventBus from "./eventBus.js";

class InputManager {
    constructor() {
        this.initialized = false;
        this.activePointers = new Map();
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;

        document.addEventListener("pointerdown", event => {
            if (event.button !== 0) return;

            const target = this.resolveTarget(event);
            if (!target || target.disabled) return;

            this.activePointers.set(event.pointerId, target);
            event.preventDefault();
        }, true);

        document.addEventListener("pointerup", event => {
            if (event.button !== 0) return;

            const target = this.activePointers.get(event.pointerId);
            this.activePointers.delete(event.pointerId);

            if (!target || target.disabled) return;

            event.preventDefault();
            event.stopImmediatePropagation();

            this.dispatch(target, event, "pointer");
        }, true);

        document.addEventListener("pointercancel", event => {
            this.activePointers.delete(event.pointerId);
        }, true);

        document.addEventListener("keydown", event => {
            if (event.repeat) return;
            if (event.key !== "Enter" && event.key !== " ") return;

            const target = this.resolveTarget(event);
            if (!target || target.disabled) return;

            event.preventDefault();
            event.stopImmediatePropagation();

            this.dispatch(target, event, "keyboard");
        }, true);

        document.documentElement.style.setProperty(
            "touch-action",
            "manipulation"
        );
    }

    resolveTarget(event) {
        const selectors =
            "[data-action], [data-tab], [data-world-category], [data-upgrade-category], button, [role='button']";

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

    dispatch(target, originalEvent, inputType) {
        if (!target || target.disabled) return false;

        const payload = {
            action: target.dataset?.action || null,
            target,
            originalEvent,
            inputType
        };

        eventBus.emit("input:pressed", payload);

        return true;
    }
}

export default new InputManager();
