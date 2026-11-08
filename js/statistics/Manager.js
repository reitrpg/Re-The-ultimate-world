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
        const gain = BigNumber.from(amount);
        if (!gain.isFinite() || !gain.greater(0)) return;

        if (!this.totalResources[id]) {
            this.totalResources[id] = BigNumber.zero();
        }

        this.totalResources[id] = this.totalResources[id].add(gain);
        eventBus.emit("statistics:update");
    }

    recordEP(amount) {
        const gain = BigNumber.from(amount);
        if (!gain.isFinite() || !gain.greater(0)) return;

        const current = BigNumber.from(this.totalEP);
        this.totalEP = current.less(0)
            ? BigNumber.zero().add(gain)
            : current.add(gain);

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
        if (!this.totalEP?.isFinite?.() || this.totalEP.less(0)) {
            this.totalEP = BigNumber.zero();
        }
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
            totalEP: this.getTotalEP().toJSON()
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
            const amount = BigNumber.from(savedResources[id] ?? 0);
            this.totalResources[id] = amount.less(0)
                ? BigNumber.zero()
                : amount;
        });

        const savedEP = BigNumber.from(data.totalEP ?? 0);
        this.totalEP = savedEP.less(0)
            ? BigNumber.zero()
            : savedEP;
    }
}

export default new StatisticsManager();
