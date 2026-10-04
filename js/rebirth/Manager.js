import eventBus from "../core/eventBus.js";
import WorldManager from "../world/Manager.js";
import StatisticsManager from "../statistics/Manager.js";

class NewBirthManager {
    getWorld() { return WorldManager.getActive(); }
    getCount() { return this.getWorld()?.rebirthCount || 0; }
    getMultiplier() { return this.getWorld()?.rebirthMultiplier || 1; }
    getSacrificeMultiplier() { return this.getWorld()?.getRebirthMultiplier() || 1; }
    canNewBirth() { return !!this.getWorld() && this.getWorld().canNewBirth(); }

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
            world.rebirthCount=0;
            world.rebirthMultiplier=world.rebirthMultiplier.constructor.one();
        }
        eventBus.emit("newbirth:update");
        eventBus.emit("world:update");
    }

    toJSON() { return {version:3}; }
    load() { eventBus.emit("newbirth:update"); }
}

export default new NewBirthManager();
