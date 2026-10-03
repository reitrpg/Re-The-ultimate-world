class Achievement {
    constructor(id = "", name = "", description = "", condition = {}, unlockEffects = []) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.condition = condition;
        this.unlockEffects = Array.isArray(unlockEffects) ? unlockEffects : [];
        this.achieved = false;
        this.achievedAt = null;
    }

    isAchieved() {
        return this.achieved;
    }

    achieve() {
        if (this.achieved) return false;
        this.achieved = true;
        this.achievedAt = Date.now();
        return true;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            condition: this.condition,
            unlockEffects: this.unlockEffects,
            achieved: this.achieved,
            achievedAt: this.achievedAt
        };
    }

    load(data) {
        if (!data) return;
        this.achieved = data.achieved === true;
        this.achievedAt = Number.isFinite(Number(data.achievedAt))
            ? Number(data.achievedAt)
            : null;
    }
}

export default Achievement;
