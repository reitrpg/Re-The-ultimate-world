import eventBus from "./eventBus.js";
import UnlockManager from "../world/UnlockManager.js";

class InputActionController {
    constructor() {
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        this.initialized = true;

        eventBus.on("world:create:request", payload => {
            this.createWorld(payload);
        });
    }

    createWorld(payload = {}) {
        const seed = payload.seed ?? Date.now().toString();
        const cost = UnlockManager.getUnlockCost();
        const created = UnlockManager.unlock(seed);

        eventBus.emit(
            created ? "world:create:success" : "world:create:failed",
            { seed, cost }
        );
    }
}

export default new InputActionController();
