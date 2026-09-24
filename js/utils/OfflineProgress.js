/**
 * World Creator
 * Offline Progress
 */

import WorldManager from "../world/Manager.js";
import ResourceManager from "../resource/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
import eventBus from "../core/eventBus.js";

class OfflineProgress {
    constructor() {
        this.maxOfflineTime = 1000 * 60 * 60 * 24;
    }

    saveTimestamp() {
        localStorage.setItem(
            "world_creator_last_time",
            String(Date.now())
        );
    }

    getTimestamp() {
        const value = Number(
            localStorage.getItem("world_creator_last_time")
        );
        return Number.isFinite(value) && value > 0 ? value : 0;
    }

    calculate() {
        const lastTime = this.getTimestamp();

        if (!lastTime) {
            this.saveTimestamp();
            return 0;
        }

        const elapsed = Math.min(
            Math.max(0, Date.now() - lastTime),
            this.maxOfflineTime
        );

        const seconds = Math.floor(elapsed / 1000);
        if (seconds <= 0) {
            this.saveTimestamp();
            return 0;
        }

        const world = WorldManager.getActive();
        if (!world) {
            this.saveTimestamp();
            return 0;
        }

        let multiplier = world.getTotalMultiplier().toNumber();
        multiplier *= ResearchManager.getTotalMultiplier();
        multiplier *= UpgradeManager.getTotalMultiplier();

        ResourceManager.produce(multiplier * seconds);
        this.saveTimestamp();

        eventBus.emit("offline:update", {
            seconds,
            amount: multiplier * seconds
        });

        return seconds;
    }
}

export default new OfflineProgress();
