import eventBus from "./eventBus.js";

class InputManager {
    constructor() {
        this.initialized = false;
        this.lastPointerTarget = null;
        this.lastPointerTime = 0;
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;

        document.addEventListener("pointerup", event => {
            this.handlePointer(event);
        }, true);

        document.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;

            const target = this.resolveTarget(event);
            if (!target || target.disabled) return;

            event.preventDefault();
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

    handlePointer(event) {
        const target = this.resolveTarget(event);

        if (!target || target.disabled) return;

        const now = Date.now();

        if (
            target === this.lastPointerTarget &&
            now - this.lastPointerTime < 300
        ) {
            return;
        }

        this.lastPointerTarget = target;
        this.lastPointerTime = now;

        this.dispatch(target, event, "pointer");
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

        if (payload.action) {
            eventBus.emit(payload.action, payload);
        }

        return true;
    }
}

export default new InputManager();
