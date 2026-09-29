/**
 * World Creator
 * BigNumber Arithmetic
 *
 * layer 0 は従来通り計算。
 * 上位層は支配項近似を使用し、巨大値の比較・消費を成立させる。
 */

import normalize from "./Normalize.js";
import { BASE } from "./Constants.js";

function make(mantissa, exponent, layer) {
    return normalize(mantissa, exponent, layer);
}

function align(a, b) {
    const exponent = Math.max(a.exponent, b.exponent);

    return {
        exponent,
        a: a.mantissa * Math.pow(BASE, a.exponent - exponent),
        b: b.mantissa * Math.pow(BASE, b.exponent - exponent)
    };
}

function add(a, b) {
    if (a.layer !== b.layer) {
        return a.layer > b.layer ? { ...a } : { ...b };
    }

    if (a.layer > 0) {
        if (a.exponent === b.exponent) {
            return make(a.mantissa + b.mantissa, a.exponent, a.layer);
        }

        return a.exponent > b.exponent ? { ...a } : { ...b };
    }

    const aligned = align(a, b);

    return make(
        aligned.a + aligned.b,
        aligned.exponent,
        0
    );
}

function subtract(a, b) {
    if (a.layer !== b.layer) {
        return a.layer > b.layer ? { ...a } : make(0, 0, 0);
    }

    if (a.exponent < b.exponent) {
        return make(0, 0, 0);
    }

    if (a.exponent === b.exponent && a.mantissa === b.mantissa) {
        return make(0, 0, 0);
    }

    if (a.layer > 0) {
        if (a.mantissa <= b.mantissa && a.exponent === b.exponent) {
            return make(0, 0, 0);
        }

        return { ...a };
    }

    const aligned = align(a, b);

    return make(
        aligned.a - aligned.b,
        aligned.exponent,
        0
    );
}

function multiply(a, b) {
    if (a.mantissa === 0 || b.mantissa === 0) {
        return make(0, 0, 0);
    }

    if (a.layer === 0 && b.layer === 0) {
        return make(
            a.mantissa * b.mantissa,
            a.exponent + b.exponent,
            0
        );
    }

    if (a.layer === 2 || b.layer === 2) {
        const high = a.layer === 2 ? a : b;
        const other = a.layer === 2 ? b : a;

        if (other.layer === 2) {
            return high.exponent >= other.exponent
                ? { ...high }
                : { ...other };
        }

        return { ...high };
    }

    const high = a.layer === 1 ? a : b;
    const other = a.layer === 1 ? b : a;

    return make(
        high.mantissa * other.mantissa,
        high.exponent + other.exponent,
        1
    );
}

function divide(a, b) {
    if (b.mantissa === 0) {
        throw new Error("BigNumber: division by zero");
    }

    if (a.layer === 0 && b.layer === 0) {
        return make(
            a.mantissa / b.mantissa,
            a.exponent - b.exponent,
            0
        );
    }

    if (a.layer === 2 || b.layer === 2) {
        if (a.layer === 2 && b.layer < 2) return { ...a };
        if (a.layer < 2 && b.layer === 2) return make(0, 0, 0);

        return a.exponent >= b.exponent
            ? { ...a }
            : make(0, 0, 0);
    }

    if (a.layer === 1 && b.layer === 0) {
        return make(
            a.mantissa / b.mantissa,
            a.exponent - b.exponent,
            1
        );
    }

    if (a.layer === 0 && b.layer === 1) {
        return make(0, 0, 0);
    }

    return make(
        a.mantissa / b.mantissa,
        a.exponent - b.exponent,
        1
    );
}

export {
    add,
    subtract,
    multiply,
    divide
};
