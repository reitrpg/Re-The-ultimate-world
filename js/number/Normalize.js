/**
 * World Creator
 * BigNumber Normalize
 *
 * Invalid mantissas/exponents are sanitized before normalization. In
 * particular, Infinity must never enter the normalization loops: dividing
 * Infinity by BASE would otherwise loop forever.
 */

import {
    BASE,
    MIN_EXPONENT,
    MAX_EXPONENT
} from "./Constants.js";

function normalize(mantissa, exponent, layer = 0) {
    const rawMantissa = Number(mantissa);
    const rawExponent = Number(exponent);

    if (Number.isNaN(rawMantissa)) {
        return { mantissa: 0, exponent: 0, layer: 0 };
    }

    let m = rawMantissa;
    let e = Number.isNaN(rawExponent) ? 0 : rawExponent;
    let l = Number.isInteger(layer)
        ? Math.min(2, Math.max(0, layer))
        : 0;

    if (m === 0) {
        return { mantissa: 0, exponent: 0, layer: 0 };
    }

    if (!Number.isFinite(m)) {
        // Saturate non-representable values instead of entering an endless loop.
        m = m < 0 ? -1 : 1;
        e = MAX_EXPONENT;
        l = 0;
    }

    if (!Number.isFinite(e)) {
        e = e === -Infinity ? MIN_EXPONENT : MAX_EXPONENT;
    }

    if (l > 0) {
        e = Math.max(0, e);

        if (Math.abs(m) < 1) {
            m = m < 0 ? -1 : 1;
        }

        return {
            mantissa: m,
            exponent: e,
            layer: l
        };
    }

    while (Math.abs(m) >= BASE) {
        m /= BASE;
        e += 1;
    }

    while (Math.abs(m) < 1 && m !== 0) {
        m *= BASE;
        e -= 1;
    }

    if (e < MIN_EXPONENT) e = MIN_EXPONENT;
    if (e > MAX_EXPONENT) e = MAX_EXPONENT;

    return {
        mantissa: m,
        exponent: e,
        layer: 0
    };
}

export default normalize;
