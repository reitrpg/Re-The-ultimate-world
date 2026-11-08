/**
 * World Creator
 * Upgrade Manager
 */

import Upgrade from "./Upgrade.js";
import BigNumber from "../number/BigNumber.js";
import eventBus from "../core/eventBus.js";

class UpgradeManager {
    constructor() {
        this.upgrades = new Map();
        this.buyAllInProgress = new Set();
        this.initialize();
    }

    initialize() {
        if (this.upgrades.size > 0) return;

        this.create("divine_revelation", "天啓:農業革命 Ⅰ", 1.20, 10, "infinite", null, true, "植物の生産量を1.2倍", "plant");
        this.create("heavenly_blessing", "神域:亡霊鉱山 Ⅰ", 1.20, 10, "infinite", null, true, "金属の生産量を1.2倍", "metal");
        this.create("world_tree", "神秘:魔法技術 Ⅰ", 1.20, 10, "infinite", null, true, "魔力の生産量を1.2倍", "magic");
        this.create("creator_will", "創造神の意思", 2.00, 1000, "infinite", null, false, "全体生産量を2倍");

        this.create("plant_fivefold", "生命樹の祝福", 5.00, 200, "limited", 1, true, "植物の生産量を5倍", "plant", "plant", "divine_revelation");
        this.create("metal_fivefold", "深淵鉱脈の祝福", 5.00, 200, "limited", 1, true, "金属の生産量を5倍", "metal", "metal", "heavenly_blessing");
        this.create("magic_fivefold", "原初魔導の祝福", 5.00, 200, "limited", 1, true, "魔力の生産量を5倍", "magic", "magic", "world_tree");
        this.create("automation_unlock", "機巧神の啓示", 1, 10000, "limited", 1, true, "自動化機能を解禁");

        this.create("buy_max_divine_revelation", "天啓：農業革命・一括購入", 1, 1000, "limited", 1, true, "天啓：農業革命に全購入ボタンを追加", null, null, "divine_revelation");
        this.create("buy_max_heavenly_blessing", "神域：亡霊鉱山・一括購入", 1, 1000, "limited", 1, true, "神域：亡霊鉱山に全購入ボタンを追加", null, null, "heavenly_blessing");
        this.create("buy_max_world_tree", "神秘：魔法技術・一括購入", 1, 1000, "limited", 1, true, "神秘：魔法技術に全購入ボタンを追加", null, null, "world_tree");
        this.create("buy_max_creator_will", "創造神の意思・一括購入", 1, 1000, "limited", 1, true, "創造神の意思に全購入ボタンを追加", null, null, "creator_will");
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

    async buyAll(id) {
        const upgrade = this.get(id);
        const unlockUpgrade = this.get("buy_max_" + id);
        if (!upgrade || upgrade.type !== "infinite" || !upgrade.isUnlocked() ||
            !unlockUpgrade || unlockUpgrade.level < 1 ||
            this.buyAllInProgress.has(id)) return 0;

        this.buyAllInProgress.add(id);
        let bought = 0;

        try {
            // 250回ごとに描画・入力へ制御を返す。これは処理分割であり購入上限ではない。
            // EP/素材が尽きるか、強化上限に達するまで最後まで購入を続ける。
            const yieldInterval = 250;
            let batchCount = 0;

            while (upgrade.canBuy()) {
                if (!upgrade.buy()) break;
                bought += 1;
                batchCount += 1;

                if (batchCount >= yieldInterval) {
                    batchCount = 0;
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        } finally {
            this.buyAllInProgress.delete(id);
            if (bought > 0) eventBus.emit("upgrade:update");
        }

        return bought;
    }

    reduceInfiniteUpgradeLevels(rate = 0.1) {
        const reductionRate = Number(rate);
        if (!Number.isFinite(reductionRate) || reductionRate < 0 || reductionRate > 1) {
            return false;
        }

        this.getByType("infinite").forEach(upgrade => {
            upgrade.level = Math.floor(Math.max(0, Number(upgrade.level) || 0) * reductionRate);
        });

        eventBus.emit("upgrade:update");
        return true;
    }

    getResourceMultiplier(id) {
        let multiplier = BigNumber.one();
        this.getAll().forEach(upgrade => {
            if (!upgrade.isUnlocked()) return;
            if (upgrade.getTargetResource?.() !== id) return;
            multiplier = multiplier.multiply(upgrade.getMultiplier());
        });
        return multiplier;
    }

    getTotalMultiplier() {
        let multiplier = BigNumber.one();
        this.getAll().forEach(upgrade => {
            if (!upgrade.isUnlocked()) return;
            if (upgrade.getTargetResource?.() !== null) return;
            multiplier = multiplier.multiply(upgrade.getMultiplier());
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
            plant_fivefold: { name: "生命樹の祝福", cost: 200, multiplier: 5.00, targetResource: "plant", costResource: "plant", prerequisiteId: "divine_revelation", effectText: "植物の生産量を5倍" },
            metal_fivefold: { name: "深淵鉱脈の祝福", cost: 200, multiplier: 5.00, targetResource: "metal", costResource: "metal", prerequisiteId: "heavenly_blessing", effectText: "金属の生産量を5倍" },
            magic_fivefold: { name: "原初魔導の祝福", cost: 200, multiplier: 5.00, targetResource: "magic", costResource: "magic", prerequisiteId: "world_tree", effectText: "魔力の生産量を5倍" },
            automation_unlock: { name: "機巧神の啓示", cost: 10000, multiplier: 1, targetResource: null, costResource: null, effectText: "自動化機能を解禁" },
            buy_max_divine_revelation: { name: "天啓：農業革命・一括購入", cost: 1000, multiplier: 1, targetResource: null, costResource: null, prerequisiteId: "divine_revelation", effectText: "天啓：農業革命に全購入ボタンを追加" },
            buy_max_heavenly_blessing: { name: "神域：亡霊鉱山・一括購入", cost: 1000, multiplier: 1, targetResource: null, costResource: null, prerequisiteId: "heavenly_blessing", effectText: "神域：亡霊鉱山に全購入ボタンを追加" },
            buy_max_world_tree: { name: "神秘：魔法技術・一括購入", cost: 1000, multiplier: 1, targetResource: null, costResource: null, prerequisiteId: "world_tree", effectText: "神秘：魔法技術に全購入ボタンを追加" },
            buy_max_creator_will: { name: "創造神の意思・一括購入", cost: 1000, multiplier: 1, targetResource: null, costResource: null, prerequisiteId: "creator_will", effectText: "創造神の意思に全購入ボタンを追加" }
        };
        Object.entries(definitions).forEach(([id, definition]) => {
            const upgrade = this.get(id);
            if (!upgrade) return;
            if (definition.name) upgrade.name = definition.name;
            if (definition.cost !== undefined) upgrade.baseCost = BigNumber.from(definition.cost);
            upgrade.multiplier = definition.multiplier;
            upgrade.targetResource = definition.targetResource;
            upgrade.costResource = definition.costResource || null;
            upgrade.prerequisiteId = definition.prerequisiteId || null;
            upgrade.effectText = definition.effectText;
        });
    }
}


export default new UpgradeManager();
