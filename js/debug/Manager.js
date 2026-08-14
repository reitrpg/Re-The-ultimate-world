/**
 * World Creator
 * Debug Manager
 */

import eventBus from "../core/eventBus.js";
import ResourceManager from "../resource/Manager.js";
import EPManager from "../ep/Manager.js";
import WorldManager from "../world/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";

class DebugManager {

    addResource(
        id,
        amount
    ) {

        ResourceManager.add(
            id,
            amount
        );

        eventBus.emit(
            "debug:update"
        );

    }

    addEP(amount) {

        EPManager.add(
            amount
        );

        eventBus.emit(
            "debug:update"
        );

    }

    setWorldLevel(level) {

        const world =
            WorldManager.getActive();

        if (!world) {

            return false;

        }

        world.level =
            Math.max(
                1,
                Number(level) || 1
            );

        eventBus.emit(
            "world:update"
        );

        return true;

    }

    setResearchLevel(
        id,
        level
    ) {

        const research =
            ResearchManager.get(id);

        if (!research) {

            return false;

        }

        research.level =
            Math.max(
                0,
                Number(level) || 0
            );

        eventBus.emit(
            "research:update"
        );

        return true;

    }

    setUpgradeLevel(
        id,
        level
    ) {

        const upgrade =
            UpgradeManager.get(id);

        if (!upgrade) {

            return false;

        }

        upgrade.level =
            Math.max(
                0,
                Number(level) || 0
            );

        eventBus.emit(
            "upgrade:update"
        );

        return true;

    }

    resetAll() {

        EPManager.reset();

        ResourceManager.clear();

        ResearchManager.reset();

        UpgradeManager.reset();

        WorldManager.clear();

        eventBus.emit(
            "debug:reset"
        );

    }

}

export default new DebugManager();