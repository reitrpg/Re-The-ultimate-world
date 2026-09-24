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

        document.addEventListener("click", event => this.dispatch(event), true);
        document.addEventListener("pointerup", event => this.dispatch(event), true);
    }

    dispatch(event) {
        const rawTarget = event.composedPath?.()[0] ?? event.target;
        const target = rawTarget?.closest?.("[data-action], button, [role='button']");

        if (!target) return;

        const now = Date.now();

        if (
            this.lastDispatchTarget === target &&
            now - this.lastDispatchTime < 500
        ) {
            return;
        }

        this.lastDispatchTarget = target;
        this.lastDispatchTime = now;

        const action = target.dataset?.action || null;

        if (action) {
            eventBus.emit(action, {
                target,
                originalEvent: event
            });
        }

        eventBus.emit("input:pressed", {
            action,
            target,
            originalEvent: event
        });
    }
}

export default new InputManager();
