/**
 * World Creator
 * BigNumber
 *
 * layer 0:
 *   mantissa × 1000^exponent
 *
 * layer 2:
 *   mantissa × 10^(10^exponent)
 *   例: 1ee1,000,000 = 10^(10^1,000,000)
 */

import normalize from "./Normalize.js";
import { add, subtract, multiply, divide } from "./Arithmetic.js";
import {
    compare,
    equal,
    greater,
    less,
    greaterOrEqual,
    lessOrEqual
} from "./Compare.js";

class BigNumber {
    constructor(mantissa = 0, exponent = 0, layer = 0) {
        const normalized = normalize(mantissa, exponent, layer);

        this.mantissa = normalized.mantissa;
        this.exponent = normalized.exponent;
        this.layer = normalized.layer;
    }

    static zero() {
        return new BigNumber(0, 0, 0);
    }

    static one() {
        return new BigNumber(1, 0, 0);
    }

    static from(value) {
        if (value instanceof BigNumber) {
            return value.clone();
        }

        if (
            value &&
            typeof value === "object" &&
            Object.prototype.hasOwnProperty.call(value, "mantissa") &&
            Object.prototype.hasOwnProperty.call(value, "exponent")
        ) {
            return new BigNumber(
                value.mantissa,
                value.exponent,
                value.layer || 0
            );
        }

        const number = Number(value);

        return new BigNumber(
            Number.isFinite(number) ? number : 0,
            0,
            0
        );
    }

    static fromLayered(mantissa, exponent, layer = 0) {
        return new BigNumber(mantissa, exponent, layer);
    }

    clone() {
        return new BigNumber(
            this.mantissa,
            this.exponent,
            this.layer
        );
    }

    add(value) {
        const result = add(this, BigNumber.from(value));
        return new BigNumber(result.mantissa, result.exponent, result.layer);
    }

    subtract(value) {
        const result = subtract(this, BigNumber.from(value));
        return new BigNumber(result.mantissa, result.exponent, result.layer);
    }

    multiply(value) {
        const result = multiply(this, BigNumber.from(value));
        return new BigNumber(result.mantissa, result.exponent, result.layer);
    }

    divide(value) {
        const result = divide(this, BigNumber.from(value));
        return new BigNumber(result.mantissa, result.exponent, result.layer);
    }

    compare(value) {
        return compare(this, BigNumber.from(value));
    }

    equal(value) {
        return equal(this, BigNumber.from(value));
    }

    greater(value) {
        return greater(this, BigNumber.from(value));
    }

    less(value) {
        return less(this, BigNumber.from(value));
    }

    greaterOrEqual(value) {
        return greaterOrEqual(this, BigNumber.from(value));
    }

    lessOrEqual(value) {
        return lessOrEqual(this, BigNumber.from(value));
    }

    toNumber() {
        if (this.layer > 0) return Infinity;

        const value = this.mantissa * Math.pow(1000, this.exponent);
        return Number.isFinite(value) ? value : Infinity;
    }

    toString() {
        if (this.mantissa === 0) return "0";

        if (this.layer >= 2) {
            return this.formatMantissa() + "ee" +
                BigNumber.formatExponent(this.exponent);
        }

        if (this.exponent === 0) {
            return String(this.mantissa);
        }

        const power = Math.floor(Math.log10(Math.abs(this.mantissa)));
        const decimalExponent = power + this.exponent * 3;
        const coefficient =
            this.mantissa / Math.pow(10, power);

        return coefficient.toFixed(2) + "e" + decimalExponent;
    }

    formatMantissa() {
        return Number.isInteger(this.mantissa)
            ? String(this.mantissa)
            : this.mantissa.toFixed(2);
    }

    static formatExponent(value) {
        return Number(value).toLocaleString("en-US");
    }

    toJSON() {
        return {
            mantissa: this.mantissa,
            exponent: this.exponent,
            layer: this.layer
        };
    }

    static fromJSON(data) {
        return BigNumber.from(data);
    }
}

export default BigNumber;
