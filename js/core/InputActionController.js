import eventBus from "./eventBus.js";
import UnlockManager from "../world/UnlockManager.js";
import WorldManager from "../world/Manager.js";
import SettingsManager from "../settings/Manager.js";

class InputActionController {
    constructor() {
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;

        eventBus.on("input:pressed", payload => {
            const action = payload?.action;

            if (action === "world:create:request") {
                this.handleWorldCreate(payload);
                return;
            }

            if (action === "world:select") {
                this.handleWorldSelect(payload);
            }
        });
    }

    handleWorldCreate(payload = {}) {
        try {
            const configuredSeed = String(
                SettingsManager.get("seed") ?? ""
            ).trim();

            const seed =
                String(payload.seed ?? configuredSeed).trim() ||
                Date.now().toString();

            const cost = UnlockManager.getUnlockCost();
            const created = UnlockManager.unlock(seed);

            eventBus.emit(
                created
                    ? "world:create:success"
                    : "world:create:failed",
                { seed, cost }
            );
        } catch (error) {
            console.error("World creation action failed:", error);
            eventBus.emit("world:create:failed", {
                code: "WORLD_CREATE_ERROR",
                error
            });
        }
    }

    handleWorldSelect(payload = {}) {
        const index = Number(
            payload.target?.dataset?.worldIndex
        );

        if (!WorldManager.setActive(index)) {
            eventBus.emit("world:select:failed", { index });
            return;
        }

        eventBus.emit("world:select:success", { index });
    }
}

export default new InputActionController();
