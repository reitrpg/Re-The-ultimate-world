/**
 * World Creator
 * BigNumber
 */

import normalize from "./Normalize.js";

import {

    add,

    subtract,

    multiply,

    divide

} from "./Arithmetic.js";

import {

    compare,

    equal,

    greater,

    less,

    greaterOrEqual,

    lessOrEqual

} from "./Compare.js";

class BigNumber {

    constructor(
        mantissa = 0,
        exponent = 0
    ) {

        const normalized = normalize(
            mantissa,
            exponent
        );

        this.mantissa =
            normalized.mantissa;

        this.exponent =
            normalized.exponent;

    }

    static from(value) {

        if (
            value instanceof BigNumber
        ) {

            return new BigNumber(
                value.mantissa,
                value.exponent
            );

        }

        return new BigNumber(
            Number(value) || 0,
            0
        );

    }

    clone() {

        return new BigNumber(
            this.mantissa,
            this.exponent
        );

    }

    add(value) {

        const other =
            BigNumber.from(value);

        const result =
            add(
                this,
                other
            );

        return new BigNumber(
            result.mantissa,
            result.exponent
        );

    }

    subtract(value) {

        const other =
            BigNumber.from(value);

        const result =
            subtract(
                this,
                other
            );

        return new BigNumber(
            result.mantissa,
            result.exponent
        );

    }

    multiply(value) {

        const other =
            BigNumber.from(value);

        const result =
            multiply(
                this,
                other
            );

        return new BigNumber(
            result.mantissa,
            result.exponent
        );

    }

    divide(value) {

        const other =
            BigNumber.from(value);

        const result =
            divide(
                this,
                other
            );

        return new BigNumber(
            result.mantissa,
            result.exponent
        );

    }

    compare(value) {

        return compare(
            this,
            BigNumber.from(value)
        );

    }

    equal(value) {

        return equal(
            this,
            BigNumber.from(value)
        );

    }

    greater(value) {

        return greater(
            this,
            BigNumber.from(value)
        );

    }

    less(value) {

        return less(
            this,
            BigNumber.from(value)
        );

    }

    greaterOrEqual(value) {

        return greaterOrEqual(
            this,
            BigNumber.from(value)
        );

    }

    lessOrEqual(value) {

        return lessOrEqual(
            this,
            BigNumber.from(value)
        );

    }

    toNumber() {

        return (
            this.mantissa *
            Math.pow(
                1000,
                this.exponent
            )
        );

    }

    toString() {

        if (
            this.exponent === 0
        ) {

            return String(
                this.mantissa
            );

        }

        return (
            this.mantissa.toFixed(2) +
            "e" +
            this.exponent
        );

    }

    toJSON() {

        return {

            mantissa:
                this.mantissa,

            exponent:
                this.exponent

        };

    }

    static fromJSON(data) {

        if (!data) {

            return new BigNumber();

        }

        return new BigNumber(
            data.mantissa,
            data.exponent
        );

    }

}

export default BigNumber;