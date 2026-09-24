/**
 * World Creator
 * BigNumber Arithmetic
 */

import normalize from "./Normalize.js";
import { BASE, PRECISION } from "./Constants.js";

function align(a, b) {
    const exponent = Math.max(a.exponent, b.exponent);

    const aShift = a.exponent - exponent;
    const bShift = b.exponent - exponent;

    return {
        exponent,
        a: a.mantissa * Math.pow(BASE, aShift),
        b: b.mantissa * Math.pow(BASE, bShift)
    };
}

function add(a, b) {
    const aligned = align(a, b);

    return normalize(
        aligned.a + aligned.b,
        aligned.exponent
    );
}

function subtract(a, b) {
    const aligned = align(a, b);

    return normalize(
        aligned.a - aligned.b,
        aligned.exponent
    );
}

function multiply(a, b) {
    return normalize(
        a.mantissa * b.mantissa,
        a.exponent + b.exponent
    );
}

function divide(a, b) {
    if (b.mantissa === 0) {
        throw new Error("BigNumber: division by zero");
    }

    return normalize(
        a.mantissa / b.mantissa,
        a.exponent - b.exponent
    );
}

export {
    add,
    subtract,
    multiply,
    divide
};
