/**
 * World Creator
 * BigNumber
 */

import normalize from "./Normalize.js";
import { add, subtract, multiply, divide } from "./Arithmetic.js";
import { compare, equal, greater, less, greaterOrEqual, lessOrEqual } from "./Compare.js";

class BigNumber {
    constructor(mantissa = 0, exponent = 0) {
        const normalized = normalize(mantissa, exponent);
        this.mantissa = normalized.mantissa;
        this.exponent = normalized.exponent;
    }

    static zero() { return new BigNumber(0, 0); }
    static one() { return new BigNumber(1, 0); }

    static from(value) {
        if (value instanceof BigNumber) {
            return new BigNumber(value.mantissa, value.exponent);
        }

        if (value && typeof value === "object" &&
            Object.prototype.hasOwnProperty.call(value, "mantissa") &&
            Object.prototype.hasOwnProperty.call(value, "exponent")) {
            return new BigNumber(value.mantissa, value.exponent);
        }

        const number = Number(value);
        return new BigNumber(Number.isFinite(number) ? number : 0, 0);
    }

    clone() { return new BigNumber(this.mantissa, this.exponent); }

    add(value) {
        const result = add(this, BigNumber.from(value));
        return new BigNumber(result.mantissa, result.exponent);
    }

    subtract(value) {
        const result = subtract(this, BigNumber.from(value));
        return new BigNumber(result.mantissa, result.exponent);
    }

    multiply(value) {
        const result = multiply(this, BigNumber.from(value));
        return new BigNumber(result.mantissa, result.exponent);
    }

    divide(value) {
        const result = divide(this, BigNumber.from(value));
        return new BigNumber(result.mantissa, result.exponent);
    }

    compare(value) { return compare(this, BigNumber.from(value)); }
    equal(value) { return equal(this, BigNumber.from(value)); }
    greater(value) { return greater(this, BigNumber.from(value)); }
    less(value) { return less(this, BigNumber.from(value)); }
    greaterOrEqual(value) { return greaterOrEqual(this, BigNumber.from(value)); }
    lessOrEqual(value) { return lessOrEqual(this, BigNumber.from(value)); }

    toNumber() { return this.mantissa * Math.pow(1000, this.exponent); }

    toString() {
        if (this.exponent === 0) return String(this.mantissa);
        return this.mantissa.toFixed(2) + "e" + this.exponent;
    }

    toJSON() { return { mantissa: this.mantissa, exponent: this.exponent }; }

    static fromJSON(data) { return BigNumber.from(data); }
}

export default BigNumber;
