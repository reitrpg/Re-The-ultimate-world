/**
 * World Creator
 * Upgrade Manager
 */

import Upgrade from "./Upgrade.js";
import eventBus from "../core/eventBus.js";

class UpgradeManager {
    constructor() {
        this.upgrades = new Map();
        this.initialize();
    }

    initialize() {
        if (this.upgrades.size > 0) {
            return;
        }

        this.create("divine_revelation", "神託", 1.20, 10, "infinite", null, true, "植物の生産量を1.2倍", "plant");
        this.create("heavenly_blessing", "天恵", 1.20, 10, "infinite", null, true, "金属の生産量を1.2倍", "metal");
        this.create("world_tree", "世界樹の加護", 1.20, 10, "infinite", null, true, "魔力の生産量を1.2倍", "magic");
        this.create("creator_will", "創造神の意思", 2.00, 1000, "infinite", null, false, "全体生産量を2倍");
        this.create("automation_unlock", "自動化解禁", 1, 10000, "limited", 1, true, "自動化機能を解禁");
    }

    create(
        id,
        name,
        multiplier,
        cost,
        type = "infinite",
        maxLevel = null,
        unlocked = true,
        effectText = "",
        targetResource = null
    ) {
        const upgrade = new Upgrade(
            id,
            name,
            multiplier,
            cost,
            type,
            maxLevel,
            effectText,
            targetResource
        );

        upgrade.unlocked = unlocked === true;
        this.upgrades.set(id, upgrade);
    }

    get(id) {
        return this.upgrades.get(id);
    }

    getAll() {
        return Array.from(this.upgrades.values());
    }

    getByType(type) {
        return this.getAll().filter(
            upgrade => upgrade.type === type
        );
    }

    unlock(id) {
        const upgrade = this.get(id);
        if (!upgrade) return false;

        upgrade.unlock();
        eventBus.emit("upgrade:update");
        return true;
    }

    isUnlocked(id) {
        return this.get(id)?.isUnlocked?.() === true;
    }

    buy(id) {
        const upgrade = this.get(id);

        if (!upgrade) {
            return false;
        }

        const result = upgrade.buy();

        if (result) {
            eventBus.emit("upgrade:update");
        }

        return result;
    }

    getResourceMultiplier(id) {
        let multiplier = 1;
        this.getAll().forEach(upgrade => {
            if (!upgrade.isUnlocked()) return;
            if (upgrade.getTargetResource?.() !== id) return;
            multiplier *= upgrade.getMultiplier();
        });
        return multiplier;
    }

    getTotalMultiplier() {
        let multiplier = 1;

        this.getAll().forEach(upgrade => {
            if (!upgrade.isUnlocked()) return;
            if (upgrade.getTargetResource?.() !== null) return;
            multiplier *= upgrade.getMultiplier();
        });

        return multiplier;
    }

    reset() {
        this.upgrades.clear();
        this.initialize();
        eventBus.emit("upgrade:update");
    }

    toJSON() {
        return this.getAll().map(
            upgrade => upgrade.toJSON()
        );
    }

    load(data) {
        this.reset();

        if (!Array.isArray(data)) {
            return;
        }

        data.forEach(upgradeData => {
            const upgrade = this.get(upgradeData.id);

            if (upgrade) {
                upgrade.load(upgradeData);
            }
        });

        this.normalizeInfiniteUpgradeDefinitions();

        eventBus.emit("upgrade:update");
    }

    normalizeInfiniteUpgradeDefinitions() {
        const definitions = {
            divine_revelation: {
                multiplier: 1.20,
                targetResource: "plant",
                effectText: "植物の生産量を1.2倍"
            },
            heavenly_blessing: {
                multiplier: 1.20,
                targetResource: "metal",
                effectText: "金属の生産量を1.2倍"
            },
            world_tree: {
                multiplier: 1.20,
                targetResource: "magic",
                effectText: "魔力の生産量を1.2倍"
            },
            creator_will: {
                multiplier: 2.00,
                targetResource: null,
                effectText: "全体生産量を2倍"
            }
        };

        Object.entries(definitions).forEach(([id, definition]) => {
            const upgrade = this.get(id);

            if (!upgrade) {
                return;
            }

            upgrade.multiplier = definition.multiplier;
            upgrade.targetResource = definition.targetResource;
            upgrade.effectText = definition.effectText;
        });
    }
}

export default new UpgradeManager();
