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

        this.create("divine_revelation", "天啓:農業革命 Ⅰ", 1.20, 10, "infinite", null, true, "植物の生産量を1.2倍", "plant");
        this.create("heavenly_blessing", "神域:亡霊鉱山 Ⅰ", 1.20, 10, "infinite", null, true, "金属の生産量を1.2倍", "metal");
        this.create("world_tree", "神秘:魔法技術 Ⅰ", 1.20, 10, "infinite", null, true, "魔力の生産量を1.2倍", "magic");
        this.create("creator_will", "創造神の意思", 2.00, 1000, "infinite", null, false, "全体生産量を2倍");

        this.create("plant_fivefold", "植物五倍", 5.00, 1000, "limited", 1, true, "植物の生産量を5倍", "plant", "plant", "divine_revelation");
        this.create("metal_fivefold", "金属五倍", 5.00, 1000, "limited", 1, true, "金属の生産量を5倍", "metal", "metal", "heavenly_blessing");
        this.create("magic_fivefold", "魔力五倍", 5.00, 1000, "limited", 1, true, "魔力の生産量を5倍", "magic", "magic", "world_tree");

        this.create("automation_unlock", "自動化解禁", 1, 10000, "limited", 1, true, "自動化機能を解禁");
    }

    create(id, name, multiplier, cost, type = "infinite", maxLevel = null, unlocked = true, effectText = "", targetResource = null, costResource = null, prerequisiteId = null) {
        const upgrade = new Upgrade(id, name, multiplier, cost, type, maxLevel, effectText, targetResource, costResource, prerequisiteId);
        upgrade.unlocked = unlocked === true;
        upgrade.setUpgradeManager(this);
        this.upgrades.set(id, upgrade);
    }

    get(id) { return this.upgrades.get(id); }
    getAll() { return Array.from(this.upgrades.values()); }
    getByType(type) { return this.getAll().filter(upgrade => upgrade.type === type); }

    unlock(id) {
        const upgrade = this.get(id);
        if (!upgrade) return false;
        upgrade.unlock();
        eventBus.emit("upgrade:update");
        return true;
    }

    isUnlocked(id) { return this.get(id)?.isUnlocked?.() === true; }

    buy(id) {
        const upgrade = this.get(id);
        if (!upgrade) return false;
        const result = upgrade.buy();
        if (result) eventBus.emit("upgrade:update");
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

    toJSON() { return this.getAll().map(upgrade => upgrade.toJSON()); }

    load(data) {
        this.reset();
        if (!Array.isArray(data)) return;
        data.forEach(upgradeData => {
            const upgrade = this.get(upgradeData.id);
            if (upgrade) upgrade.load(upgradeData);
        });
        this.normalizeUpgradeDefinitions();
        eventBus.emit("upgrade:update");
    }

    normalizeUpgradeDefinitions() {
        const definitions = {
            divine_revelation: { name: "天啓:農業革命 Ⅰ", multiplier: 1.20, targetResource: "plant", effectText: "植物の生産量を1.2倍" },
            heavenly_blessing: { name: "神域:亡霊鉱山 Ⅰ", multiplier: 1.20, targetResource: "metal", effectText: "金属の生産量を1.2倍" },
            world_tree: { name: "神秘:魔法技術 Ⅰ", multiplier: 1.20, targetResource: "magic", effectText: "魔力の生産量を1.2倍" },
            creator_will: { multiplier: 2.00, targetResource: null, effectText: "全体生産量を2倍" },
            plant_fivefold: { multiplier: 5.00, targetResource: "plant", costResource: "plant", prerequisiteId: "divine_revelation", effectText: "植物の生産量を5倍" },
            metal_fivefold: { multiplier: 5.00, targetResource: "metal", costResource: "metal", prerequisiteId: "heavenly_blessing", effectText: "金属の生産量を5倍" },
            magic_fivefold: { multiplier: 5.00, targetResource: "magic", costResource: "magic", prerequisiteId: "world_tree", effectText: "魔力の生産量を5倍" }
        };
        Object.entries(definitions).forEach(([id, definition]) => {
            const upgrade = this.get(id);
            if (!upgrade) return;
            if (definition.name) upgrade.name = definition.name;
            upgrade.multiplier = definition.multiplier;
            upgrade.targetResource = definition.targetResource;
            upgrade.costResource = definition.costResource || null;
            upgrade.prerequisiteId = definition.prerequisiteId || null;
            upgrade.effectText = definition.effectText;
        });
    }
}

export default new UpgradeManager();
