import Achievement from "./Achievement.js";
import StatisticsManager from "../statistics/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";

import BigNumber from "../number/BigNumber.js";
import eventBus from "../core/eventBus.js";

class AchievementManager {
    constructor() {
        this.achievements = new Map();
        this.initialize();
    }

    initialize() {
        if (this.achievements.size > 0) return;

        this.create(
            "first_world",
            "最初の世界",
            "世界を1つ作成する",
            { type: "worldCount", value: 1 }
        );

        this.create(
            "first_upgrade",
            "最初の強化",
            "アップグレードを1回購入する",
            { type: "upgradeLevel", value: 1 }
        );

        this.create(
            "first_research",
            "最初の研究",
            "研究を1回進める",
            { type: "researchLevel", value: 1 }
        );

        this.create(
            "first_rebirth",
            "最初の転生",
            "転生を1回行う",
            { type: "rebirthCount", value: 1 },
            [
                { type: "unlock", target: "upgrade", id: "creator_will" }
            ]
        );

        this.create(
            "ep_1000",
            "EP収集家",
            "総取得EPが1000に到達する",
            { type: "totalEP", value: 1000 }
        );

        this.create(
            "resource_10000",
            "資源の蓄積",
            "総取得素材が10000に到達する",
            { type: "totalResources", value: 10000 }
        );

        this.create(
            "world_level_10",
            "世界の成長",
            "いずれかの世界をLv10にする",
            { type: "worldLevel", value: 10 }
        );
    }

    create(id, name, description, condition, unlockEffects = []) {
        this.achievements.set(
            id,
            new Achievement(id, name, description, condition, unlockEffects)
        );
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
        const value = Number(condition.value) || 0;
        const worldManager = context.worldManager;
        const upgradeManager = context.upgradeManager;
        const researchManager = context.researchManager;

        switch (condition.type) {
            case "worldCount":
                return worldManager?.getCount?.() >= value;

            case "upgradeLevel":
                return upgradeManager?.getAll?.().some(
                    upgrade => upgrade.level >= value
                );

            case "researchLevel":
                return researchManager?.getAll?.().some(
                    research => research.level >= value
                );

            case "rebirthCount":
                return StatisticsManager.getRebirthCount() >= value;

            case "totalEP":
                return StatisticsManager.getTotalEP().greaterOrEqual(
                    BigNumber.from(value)
                );

            case "totalResources":
                return StatisticsManager.getTotalResources().greaterOrEqual(
                    BigNumber.from(value)
                );

            case "worldLevel":
                return worldManager?.getAll?.().some(
                    world => Number(world.level) >= value
                );

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

        if (changed) {
            eventBus.emit("achievement:update");
        }

        return changed;
    }

    applyUnlockEffects(achievement) {
        for (const effect of achievement.unlockEffects) {
            if (effect?.type !== "unlock") continue;
            if (effect.target === "upgrade") {
                UpgradeManager.unlock(effect.id);
            }
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
                if (achievement.isAchieved()) {
                    this.applyUnlockEffects(achievement);
                }
            }
        });

        eventBus.emit("achievement:update");
    }
}

export default new AchievementManager();
