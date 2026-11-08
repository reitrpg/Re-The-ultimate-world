/**
 * World Creator
 * BigNumber Arithmetic
 *
 * layer 0 uses aligned signed arithmetic.
 * Higher layers use dominant-term approximations.
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
    if (b.mantissa === 0) {
        return { ...a };
    }

    // Subtraction is addition of the sign-reversed right operand. This keeps
    // the exponent/layer approximation consistent for positive and negative
    // operands instead of incorrectly returning zero when exponents differ.
    return add(a, {
        mantissa: -b.mantissa,
        exponent: b.exponent,
        layer: b.layer
    });
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

    if (a.mantissa === 0) {
        return make(0, 0, 0);
    }

    if (a.layer === 0 && b.layer === 0) {
        return make(
            a.mantissa / b.mantissa,
            a.exponent - b.exponent,
            0
        );
    }

    if (a.layer === 2 || b.layer === 2) {
        if (a.layer === 2 && b.layer < 2) {
            const result = { ...a };
            result.mantissa = Math.sign(a.mantissa) * Math.sign(b.mantissa) *
                Math.abs(a.mantissa);
            return result;
        }

        if (a.layer < 2 && b.layer === 2) {
            return make(Math.sign(a.mantissa) * Math.sign(b.mantissa), 0, 0);
        }

        if (a.exponent >= b.exponent) {
            return make(
                Math.sign(a.mantissa) * Math.sign(b.mantissa),
                Math.max(0, a.exponent - b.exponent),
                2
            );
        }

        return make(0, 0, 0);
    }

    if (a.layer === 1 && b.layer === 0) {
        return make(
            a.mantissa / b.mantissa,
            a.exponent - b.exponent,
            1
        );
    }

    if (a.layer === 0 && b.layer === 1) {
        return make(
            Math.sign(a.mantissa) * Math.sign(b.mantissa),
            0,
            0
        );
    }

    return make(
        (Math.sign(a.mantissa) * Math.sign(b.mantissa)) *
            (Math.abs(a.mantissa) / Math.abs(b.mantissa)),
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
