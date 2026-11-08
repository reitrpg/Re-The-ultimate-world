/**
 * World Creator
 * EP Manager
 */

import BigNumber from "../number/BigNumber.js";
import eventBus from "../core/eventBus.js";
import StatisticsManager from "../statistics/Manager.js";

class EPManager {
    constructor() {
        this.amount = BigNumber.zero();
    }

    sanitizeAmount(value) {
        const amount = BigNumber.from(value);

        if (!amount.isFinite() || amount.less(0)) {
            return BigNumber.zero();
        }

        return amount;
    }

    get() {
        // Repair legacy/corrupted negative values before exposing them to UI
        // and purchase calculations.
        if (!this.amount?.isFinite?.() || this.amount.less(0)) {
            this.amount = BigNumber.zero();
        }

        return this.amount;
    }

    set(value) {
        this.amount = this.sanitizeAmount(value);
        eventBus.emit("ep:update");
        return true;
    }

    add(value) {
        const current = this.sanitizeAmount(this.amount);
        this.amount = current;

        const gain = BigNumber.from(value);

        // EP is a non-negative game resource. Negative/zero gains are ignored
        // so a bad multiplier or stale state cannot corrupt the EP balance.
        if (!gain.isFinite() || !gain.greater(0)) {
            return false;
        }

        this.amount = current.add(gain);

        if (!this.amount.isFinite() || this.amount.less(0)) {
            this.amount = BigNumber.zero();
            return false;
        }

        StatisticsManager.recordEP(gain);
        eventBus.emit("ep:update");
        return true;
    }

    consume(value) {
        const cost = BigNumber.from(value);

        if (!cost.isFinite() || cost.lessOrEqual(0)) {
            return false;
        }

        const current = this.sanitizeAmount(this.amount);
        this.amount = current;
        if (current.less(cost)) {
            return false;
        }

        const remaining = current.subtract(cost);
        this.amount = remaining.less(0)
            ? BigNumber.zero()
            : remaining;

        eventBus.emit("ep:update");
        return true;
    }

    has(value) {
        const cost = BigNumber.from(value);

        if (!cost.isFinite() || cost.less(0)) {
            return false;
        }

        const current = this.sanitizeAmount(this.amount);
        this.amount = current;
        return current.greaterOrEqual(cost);
    }

    reset() {
        this.amount = BigNumber.zero();
        eventBus.emit("ep:update");
    }

    toJSON() {
        return {
            amount: this.get().toJSON()
        };
    }

    load(data) {
        this.amount = this.sanitizeAmount(data?.amount ?? 0);
    }
}

export default new EPManager();
