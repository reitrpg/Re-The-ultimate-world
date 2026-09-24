import eventBus from "./eventBus.js";

class InputManager {
    constructor() {
        this.initialized = false;
        this.lastPointerTime = 0;
        this.lastTarget = null;
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;

        document.addEventListener("pointerup", event => this.dispatch(event), true);
        document.addEventListener("touchend", event => this.dispatch(event), true);
        document.addEventListener("click", event => this.dispatch(event), true);
    }

    dispatch(event) {
        const target = event.target instanceof Element
            ? event.target.closest("[data-action], button, [role='button']")
            : null;

        if (!target) return;

        const now = Date.now();
        if (this.lastTarget === target && now - this.lastPointerTime < 500) return;

        this.lastTarget = target;
        this.lastPointerTime = now;

        const action = target.dataset.action;

        if (action) {
            eventBus.emit(action, {
                target,
                originalEvent: event
            });
        }

        eventBus.emit("input:pressed", {
            action: action || null,
            target,
            originalEvent: event
        });
    }
}

export default new InputManager();
