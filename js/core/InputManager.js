import eventBus from "./eventBus.js";

class InputManager {
    constructor() {
        this.initialized = false;
        this.lastDispatchTime = 0;
        this.lastDispatchTarget = null;
    }

    initialize() {
        if (this.initialized) return;

        this.initialized = true;

        // pointerdown is the primary input path because it is emitted
        // consistently by touch and mouse/pointer devices.
        document.addEventListener(
            "pointerdown",
            event => this.dispatch(event),
            true
        );

        // Keep click as a compatibility path for browsers/WebViews that
        // do not expose a usable PointerEvent sequence.
        document.addEventListener(
            "click",
            event => this.dispatch(event),
            true
        );
    }

    resolveTarget(event) {
        const path = typeof event.composedPath === "function"
            ? event.composedPath()
            : [];

        for (const node of path) {
            if (node && typeof node.closest === "function") {
                const target = node.closest(
                    "[data-action], button, [role='button']"
                );

                if (target) return target;
            }
        }

        const target = event.target;

        if (target && typeof target.closest === "function") {
            return target.closest(
                "[data-action], button, [role='button']"
            );
        }

        return null;
    }

    dispatch(event) {
        const target = this.resolveTarget(event);

        if (!target) return false;

        const now = Date.now();

        if (
            this.lastDispatchTarget === target &&
            now - this.lastDispatchTime < 800
        ) {
            return false;
        }

        this.lastDispatchTarget = target;
        this.lastDispatchTime = now;

        const action = target.dataset?.action || null;
        const payload = {
            target,
            originalEvent: event
        };

        // Action events are the application-level input contract.
        // Any registered feature listener receives the event here.
        if (action) {
            eventBus.emit(action, payload);
        }

        eventBus.emit("input:pressed", {
            action,
            target,
            originalEvent: event
        });

        return true;
    }
}

export default new InputManager();
