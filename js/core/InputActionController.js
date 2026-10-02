import eventBus from "./eventBus.js";
import UnlockManager from "../world/UnlockManager.js";
import WorldManager from "../world/Manager.js";
import SettingsManager from "../settings/Manager.js";

class InputActionController {
    constructor() {
        this.initialized = false;
        this.lastSequence = 0;
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;

        eventBus.on("input:pressed", payload => {
            const sequence = Number(payload?.sequence || 0);

            if (sequence > 0 && sequence <= this.lastSequence) {
                window.__WC_INPUT_DIAGNOSTICS__?.record(
                    "ACTION_DUPLICATE_BLOCKED",
                    {
                        sequence,
                        action: payload?.action || null
                    }
                );
                return;
            }

            if (sequence > 0) {
                this.lastSequence = sequence;
            }

            const action = this.resolveAction(payload);

            if (!action) return;

            window.__WC_INPUT_DIAGNOSTICS__?.record(
                "ACTION_ROUTE",
                {
                    sequence,
                    action
                }
            );

            eventBus.emit("action:" + action, payload);

            if (action === "world:create:request") {
                this.handleWorldCreate(payload);
                return;
            }

            if (action === "world:select") {
                this.handleWorldSelect(payload);
            }
        });
    }

    resolveAction(payload = {}) {
        const target = payload.target;

        if (payload.action) {
            return payload.action;
        }

        if (target?.dataset?.tab) {
            return "tab:change";
        }

        if (target?.dataset?.worldCategory) {
            return "world:category";
        }

        if (target?.dataset?.upgradeCategory) {
            return "upgrade:category";
        }

        return null;
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
