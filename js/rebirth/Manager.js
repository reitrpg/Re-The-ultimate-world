import eventBus from "../core/eventBus.js";
import WorldManager from "../world/Manager.js";

class RebirthManager {
    getWorld() { return WorldManager.getActive(); }
    getCount() { return this.getWorld()?.rebirthCount || 0; }
    getMultiplier() { return this.getWorld()?.rebirthMultiplier || 1; }
    getSacrificeMultiplier() { return this.getWorld()?.getRebirthMultiplier() || 1; }
    canRebirth() { return !!this.getWorld() && this.getWorld().canRebirth(); }

    rebirth() {
        const world=this.getWorld();
        if(!world || !world.performRebirth()) return false;
        eventBus.emit("rebirth:update");
        eventBus.emit("world:update");
        return true;
    }

    reset() {
        for(const world of WorldManager.getAll()) {
            world.rebirthCount=0;
            world.rebirthMultiplier=world.rebirthMultiplier.constructor.one();
        }
        eventBus.emit("rebirth:update");
        eventBus.emit("world:update");
    }

    toJSON() { return {version:2}; }
    load() { eventBus.emit("rebirth:update"); }
}

export default new RebirthManager();
