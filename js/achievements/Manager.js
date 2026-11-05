import Achievement from "./Achievement.js";
import StatisticsManager from "../statistics/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
import EPManager from "../ep/Manager.js";

import BigNumber from "../number/BigNumber.js";
import eventBus from "../core/eventBus.js";

class AchievementManager {
    constructor() {
        this.achievements = new Map();
        this.initialize();
    }

    initialize() {
        if (this.achievements.size > 0) return;

        // 基本進行
        this.create("first_world", "創世の第一歩", "世界を1つ作成する", { type: "worldCount", value: 1 });
        this.create("first_upgrade", "最初の強化", "アップグレードを1回購入する", { type: "upgradeLevel", value: 1 });
        this.create(
            "first_research",
            "最初の研究",
            "研究を1回進める",
            { type: "researchLevel", value: 1 }
        );
        this.create(
            "first_rebirth",
            "新生の始まり",
            "新生を1回行う",
            { type: "rebirthCount", value: 1 },
            [{ type: "unlock", target: "upgrade", id: "creator_will" }]
        );

        // 累計EP
        this.create("ep_1000", "EP収集家", "総取得EPが1,000に到達する", { type: "totalEP", value: 1000 });
        this.create("total_ep_1e6", "エネルギー備蓄", "総取得EPが1e6に到達する", { type: "totalEP", value: 1e6 });
        this.create("total_ep_1e12", "尽きない供給", "総取得EPが1e12に到達する", { type: "totalEP", value: 1e12 });

        // 現在EPの到達記録
        const epMilestones = [
            ["ep_current_1e6", "小さな宇宙", "1e6", 1e6],
            ["ep_current_1e12", "星雲規模", "1e12", 1e12],
            ["ep_current_1e30", "銀河の胎動", "1e30", 1e30],
            ["ep_current_1e100", "天文学的蓄積", "1e100", 1e100],
            ["ep_current_1e200", "宇宙の臨界点", "1e200", 1e200],
            ["ep_current_1e300", "無限に迫る力", "1e300", 1e300],
            [
                "ep_phase1_clear",
                "有限の終端",
                "1.8e308",
                { mantissa: 180, exponent: 102, layer: 0 }
            ]
        ];

        epMilestones.forEach(([id, name, threshold, value]) => {
            const phaseClear = id === "ep_phase1_clear";
            this.create(
                id,
                name,
                phaseClear
                    ? "現在EPを1.8e308に到達させる（フェーズ1完了）"
                    : "現在EPを" + threshold + "に到達させる",
                { type: "currentEP", value }
            );
        });

        // 素材の累積生産
        this.create("resource_10000", "資源の蓄積", "総取得素材が10,000に到達する", { type: "totalResources", value: 10000 });
        this.create("total_resources_1e6", "豊穣の世界", "総取得素材が1e6に到達する", { type: "totalResources", value: 1e6 });
        this.create("total_resources_1e12", "資源圏の拡大", "総取得素材が1e12に到達する", { type: "totalResources", value: 1e12 });

        // 世界の成長
        this.create("world_level_10", "世界の成長", "いずれかの世界をLv10にする", { type: "worldLevel", value: 10 });
        this.create("world_level_25", "発展する世界", "いずれかの世界をLv25にする", { type: "worldLevel", value: 25 });
        this.create("world_level_50", "成熟した世界", "いずれかの世界をLv50にする", { type: "worldLevel", value: 50 });
        this.create("world_level_100", "世界の極致", "いずれかの世界をLv100にする", { type: "worldLevel", value: 100 });
        this.create("world_count_3", "複数世界の管理者", "世界を合計3つ作成する", { type: "worldCount", value: 3 });
        this.create("world_count_5", "小宇宙群", "世界を合計5つ作成する", { type: "worldCount", value: 5 });

        // 強化と新生
        this.create("upgrade_level_10", "強化の基礎", "いずれかの強化をLv10にする", { type: "upgradeLevel", value: 10 });
        this.create("upgrade_level_50", "強化の熟練者", "いずれかの強化をLv50にする", { type: "upgradeLevel", value: 50 });
        this.create("upgrade_level_100", "限界を越えて", "いずれかの強化をLv100にする", { type: "upgradeLevel", value: 100 });
        this.create("rebirth_10", "新生を重ねて", "新生を10回行う", { type: "rebirthCount", value: 10 });
        this.create("rebirth_50", "再創造の連鎖", "新生を50回行う", { type: "rebirthCount", value: 50 });
        this.create("rebirth_100", "創世の循環", "新生を100回行う", { type: "rebirthCount", value: 100 });
    }

    create(id, name, description, condition, unlockEffects = []) {
        this.achievements.set(id, new Achievement(id, name, description, condition, unlockEffects));
    }

    get(id) {
        return this.achievements.get(id);
    }

    getAll() {
        return Array.from(this.achievements.values());
    }

    getAchievedCount() {
        return this.getAll().filter(achievement => achievement.isAchieved()).length;
    }

    getTotalMultiplier() {
        return 1 + this.getAchievedCount() * 0.0001;
    }

    getUnlockTargetName(id) {
        return UpgradeManager.get(id)?.name || null;
    }

    isUnlocked(target, id) {
        return this.getAll().some(
            achievement =>
                achievement.isAchieved() &&
                achievement.unlockEffects.some(
                    effect =>
                        effect?.type === "unlock" &&
                        effect?.target === target &&
                        effect?.id === id
                )
        );
    }

    checkCondition(achievement, context = {}) {
        const condition = achievement.condition || {};
        const rawValue = condition.value;
        const numericValue = Number(rawValue);
        const worldManager = context.worldManager;
        const upgradeManager = context.upgradeManager;
        const researchManager = context.researchManager;

        switch (condition.type) {
            case "worldCount":
                return worldManager?.getCount?.() >= numericValue;

            case "upgradeLevel":
                return upgradeManager?.getAll?.().some(upgrade => upgrade.level >= numericValue);

            case "researchLevel":
                return researchManager?.getAll?.().some(research => research.level >= numericValue);

            case "rebirthCount":
                return StatisticsManager.getRebirthCount() >= numericValue;

            case "totalEP":
                return StatisticsManager.getTotalEP().greaterOrEqual(BigNumber.from(rawValue));

            case "currentEP":
                return EPManager.get().greaterOrEqual(BigNumber.from(rawValue));

            case "totalResources":
                return StatisticsManager.getTotalResources().greaterOrEqual(BigNumber.from(rawValue));

            case "worldLevel":
                return worldManager?.getAll?.().some(world => Number(world.level) >= numericValue);

            default:
                return false;
        }
    }

    update(context = {}) {
        let changed = false;

        for (const achievement of this.getAll()) {
            if (achievement.isAchieved()) continue;
            if (!this.checkCondition(achievement, context)) continue;

            if (achievement.achieve()) {
                changed = true;
                this.applyUnlockEffects(achievement);
                eventBus.emit("achievement:achieved", achievement);
            }
        }

        if (changed) eventBus.emit("achievement:update");
        return changed;
    }

    applyUnlockEffects(achievement) {
        for (const effect of achievement.unlockEffects) {
            if (effect?.type !== "unlock") continue;
            if (effect.target === "upgrade") UpgradeManager.unlock(effect.id);
        }
    }

    reset() {
        this.achievements.clear();
        this.initialize();
        eventBus.emit("achievement:update");
    }

    toJSON() {
        return this.getAll().map(achievement => achievement.toJSON());
    }

    load(data) {
        this.reset();
        if (!Array.isArray(data)) return;

        data.forEach(achievementData => {
            const achievement = this.get(achievementData.id);
            if (achievement) {
                achievement.load(achievementData);
                if (achievement.isAchieved()) this.applyUnlockEffects(achievement);
            }
        });

        eventBus.emit("achievement:update");
    }
}

export default new AchievementManager();
