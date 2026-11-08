import BigNumber from "../number/BigNumber.js";
import eventBus from "../core/eventBus.js";

class PlasmaManager {
    constructor() {
        this.unlocked = false;
        this.energy = BigNumber.zero();
    }

    isUnlocked() {
        return this.unlocked === true;
    }

    getEnergy() {
        return this.energy;
    }

    unlockFirst() {
        if (this.unlocked) return false;
        this.unlocked = true;
        this.energy = BigNumber.one();
        eventBus.emit("plasma:update");
        return true;
    }

    add(value) {
        if (!this.unlocked) return false;
        const gain = BigNumber.from(value);
        if (!gain.isFinite() || !gain.greater(0)) return false;
        this.energy = this.energy.add(gain);
        eventBus.emit("plasma:update");
        return true;
    }

    reset() {
        this.unlocked = false;
        this.energy = BigNumber.zero();
        eventBus.emit("plasma:update");
    }

    toJSON() {
        return { unlocked: this.unlocked, energy: this.energy.toJSON() };
    }

    load(data) {
        this.unlocked = data?.unlocked === true;
        this.energy = BigNumber.from(data?.energy ?? 0);
        if (!this.energy.isFinite() || this.energy.less(0)) this.energy = BigNumber.zero();
        if (this.unlocked && this.energy.isZero()) this.energy = BigNumber.one();
    }
}

export default new PlasmaManager();
