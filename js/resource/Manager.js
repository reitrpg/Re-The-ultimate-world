/**
 * World Creator
 * Resource Manager
 */

import Resource from "./Resource.js";
import BigNumber from "../number/BigNumber.js";
import eventBus from "../core/eventBus.js";
import StatisticsManager from "../statistics/Manager.js";

class ResourceManager {
    constructor() {
        this.resources = new Map();
    }

    create(resource) {
        this.resources.set(resource.id, resource);
        eventBus.emit("resource:update");
        return resource;
    }

    createDefaultResources() {
        const defaults = [
            ["plant", "植物"],
            ["metal", "金属"],
            ["magic", "魔力"]
        ];

        defaults.forEach(([id, name]) => {
            if (!this.exists(id)) {
                this.create(new Resource(id, name, 0, 0));
            }
        });
    }

    get(id) {
        return this.resources.get(id);
    }

    getAll() {
        return Array.from(this.resources.values());
    }

    exists(id) {
        return this.resources.has(id);
    }

    add(id, amount) {
        const resource = this.get(id);
        if (!resource) return false;

        const gain = BigNumber.from(amount);
        if (!gain.isFinite() || !gain.greater(0)) return false;

        const current = BigNumber.from(resource.amount);
        resource.amount = current.less(0)
            ? BigNumber.zero().add(gain)
            : current.add(gain);

        StatisticsManager.recordResource(id, gain);
        eventBus.emit("resource:update");
        return true;
    }

    consume(id, amount) {
        const resource = this.get(id);
        if (!resource) return false;

        const cost = BigNumber.from(amount);
        if (!cost.isFinite() || !cost.greater(0)) return false;

        const current = BigNumber.from(resource.amount);
        if (!current.isFinite() || current.less(0) || current.less(cost)) return false;

        resource.amount = current.subtract(cost);
        eventBus.emit("resource:update");
        return true;
    }

    has(id, amount) {
        const resource = this.get(id);
        if (!resource) return false;

        const cost = BigNumber.from(amount);
        if (!cost.isFinite() || cost.less(0)) return false;

        const current = BigNumber.from(resource.amount);
        return current.isFinite() && !current.less(0) &&
            current.greaterOrEqual(cost);
    }

    produce(id, amount, emitUpdate = true) {
        const resource = this.get(id);
        if (!resource) return false;

        const gain = BigNumber.from(amount);
        if (!gain.isFinite() || !gain.greater(0)) return false;

        const current = BigNumber.from(resource.amount);
        resource.amount = current.less(0)
            ? BigNumber.zero().add(gain)
            : current.add(gain);

        StatisticsManager.recordResource(id, gain);

        if (emitUpdate) eventBus.emit("resource:update");
        return true;
    }

    /**
     * 新生時に素材3種の所持量のみを初期化する。
     * 生産量・累計統計・素材定義は維持する。
     */
    resetAmounts(ids = ["plant", "metal", "magic"]) {
        ids.forEach(id => {
            const resource = this.get(id);
            if (!resource) return;
            resource.amount = BigNumber.zero();
        });

        eventBus.emit("resource:update");
    }

    clear() {
        this.resources.clear();
        this.createDefaultResources();
        eventBus.emit("resource:update");
    }

    toJSON() {
        return this.getAll().map(resource => resource.toJSON());
    }

    load(data) {
        this.resources.clear();

        if (!Array.isArray(data)) {
            this.createDefaultResources();
            return;
        }

        data.forEach(resourceData => {
            const resource = new Resource();
            resource.load(resourceData);
            if (resource.id === "material") {
                resource.id = "plant";
                resource.name = "植物";
            }
            this.resources.set(resource.id, resource);
        });

        this.createDefaultResources();
        eventBus.emit("resource:update");
    }
}

export default new ResourceManager();
