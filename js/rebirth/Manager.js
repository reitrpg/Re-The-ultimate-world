import eventBus from "../core/eventBus.js";
import WorldManager from "../world/Manager.js";
import StatisticsManager from "../statistics/Manager.js";

class NewBirthManager {
    getWorld() { return WorldManager.getActive(); }
    getCount(index = null) {
        const world = index === null ? this.getWorld() : WorldManager.get(Number(index));
        return world?.newBirthCount || 0;
    }

    getMultiplier(index = null) {
        const world = index === null ? this.getWorld() : WorldManager.get(Number(index));
        return world?.newBirthMultiplier || 1;
    }

    getSacrificeMultiplier(index = null) {
        const world = index === null ? this.getWorld() : WorldManager.get(Number(index));
        return world?.getNewBirthMultiplier() || 1;
    }

    canNewBirth(index = null) {
        const world = index === null ? this.getWorld() : WorldManager.get(Number(index));
        return !!world && world.canNewBirth();
    }

    newBirth(index = null) {
        const world = index === null
            ? this.getWorld()
            : WorldManager.get(Number(index));

        if (!world || !world.performNewBirth()) return false;

        StatisticsManager.recordRebirth();
        eventBus.emit("newbirth:update", { world });
        eventBus.emit("world:update");
        return true;
    }

    reset() {
        for(const world of WorldManager.getAll()) {
            world.newBirthCount = 0;
            world.newBirthMultiplier = world.newBirthMultiplier.constructor.one();
        }
        eventBus.emit("newbirth:update");
        eventBus.emit("world:update");
    }

    toJSON() { return {version:3}; }
    load() { eventBus.emit("newbirth:update"); }
}

export default new NewBirthManager();
