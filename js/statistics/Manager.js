import BigNumber from "../number/BigNumber.js";
import eventBus from "../core/eventBus.js";

const RESOURCE_IDS = ["plant", "metal", "magic"];

class StatisticsManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.onlineTime = 0;
        this.offlineTime = 0;
        this.rebirthCount = 0;
        this.totalResources = {
            plant: BigNumber.zero(),
            metal: BigNumber.zero(),
            magic: BigNumber.zero()
        };
        this.totalEP = BigNumber.zero();
    }

    recordOnlineTime(seconds) {
        const value = Number(seconds);
        if (!Number.isFinite(value) || value <= 0) return;
        this.onlineTime += value;
        eventBus.emit("statistics:update");
    }

    recordOfflineTime(seconds) {
        const value = Number(seconds);
        if (!Number.isFinite(value) || value <= 0) return;
        this.offlineTime += value;
        eventBus.emit("statistics:update");
    }

    recordResource(id, amount) {
        if (!RESOURCE_IDS.includes(id)) return;
        if (!this.totalResources[id]) {
            this.totalResources[id] = BigNumber.zero();
        }
        this.totalResources[id] = this.totalResources[id].add(amount);
        eventBus.emit("statistics:update");
    }

    recordEP(amount) {
        this.totalEP = this.totalEP.add(amount);
        eventBus.emit("statistics:update");
    }

    recordRebirth() {
        this.rebirthCount += 1;
        eventBus.emit("statistics:update");
    }

    getOnlineTime() {
        return Math.max(0, this.onlineTime);
    }

    getOfflineTime() {
        return Math.max(0, this.offlineTime);
    }

    getTotalGameTime() {
        return this.getOnlineTime() + this.getOfflineTime();
    }

    getRebirthCount() {
        return Math.max(0, this.rebirthCount);
    }

    getTotalResources() {
        return RESOURCE_IDS.reduce(
            (total, id) => total.add(this.totalResources[id] || BigNumber.zero()),
            BigNumber.zero()
        );
    }

    getTotalResource(id) {
        return this.totalResources[id] || BigNumber.zero();
    }

    getTotalEP() {
        return this.totalEP;
    }

    toJSON() {
        return {
            onlineTime: this.getOnlineTime(),
            offlineTime: this.getOfflineTime(),
            rebirthCount: this.getRebirthCount(),
            totalResources: Object.fromEntries(
                RESOURCE_IDS.map(id => [id, this.getTotalResource(id).toJSON()])
            ),
            totalEP: this.totalEP.toJSON()
        };
    }

    load(data) {
        this.reset();

        if (!data || typeof data !== "object") {
            return;
        }

        this.onlineTime = Math.max(0, Number(data.onlineTime) || 0);
        this.offlineTime = Math.max(0, Number(data.offlineTime) || 0);
        this.rebirthCount = Math.max(0, Number(data.rebirthCount) || 0);

        const savedResources = data.totalResources || {};
        RESOURCE_IDS.forEach(id => {
            this.totalResources[id] = BigNumber.from(savedResources[id] ?? 0);
        });

        this.totalEP = BigNumber.from(data.totalEP ?? 0);
    }
}

export default new StatisticsManager();
