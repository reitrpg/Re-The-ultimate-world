import eventBus from "./eventBus.js";

class InputManager {
    constructor() {
        this.initialized = false;
        this.lastDispatchTime = 0;
        this.lastDispatchTarget = null;
        this.lastPointerType = null;
    }

    initialize() {
        if (this.initialized) return;

        this.initialized = true;

        const handle = event => this.dispatch(event);

        // Mobile WebView/browser compatibility:
        // pointerdown/touchstart provide an early fallback, while the
        // release/click events cover platforms that do not expose them.
        [
            "pointerdown",
            "touchstart",
            "pointerup",
            "touchend",
            "mouseup",
            "click"
        ].forEach(type => {
            document.addEventListener(type, handle, true);
        });

        document.addEventListener("keyup", event => {
            if (event.key === "Enter" || event.key === " ") {
                this.dispatch(event);
            }
        }, true);
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

    shouldDispatch(target, event) {
        const now = Date.now();

        // The same physical press can arrive as several browser events.
        // Suppress only repeated events for the same target.
        if (
            this.lastDispatchTarget === target &&
            now - this.lastDispatchTime < 500
        ) {
            return false;
        }

        this.lastDispatchTarget = target;
        this.lastDispatchTime = now;
        this.lastPointerType = event.pointerType || event.type;

        return true;
    }

    dispatch(event) {
        const target = this.resolveTarget(event);

        if (!target || target.disabled) return false;
        if (!this.shouldDispatch(target, event)) return false;

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
