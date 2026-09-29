/**
 * World Creator
 * BigNumber Normalize
 */

import {
    BASE,
    MIN_EXPONENT,
    MAX_EXPONENT
} from "./Constants.js";

function normalize(mantissa, exponent, layer = 0) {
    let m = Number(mantissa) || 0;
    let e = Number(exponent) || 0;
    let l = Number.isInteger(layer) ? layer : 0;

    if (m === 0) {
        return { mantissa: 0, exponent: 0, layer: 0 };
    }

    if (l > 0) {
        l = Math.min(2, Math.max(1, l));
        e = Math.max(0, e);

        if (Math.abs(m) < 1) {
            m = 1;
        }

        return {
            mantissa: m,
            exponent: e,
            layer: l
        };
    }

    while (Math.abs(m) >= BASE) {
        m /= BASE;
        e++;
    }

    while (Math.abs(m) < 1 && m !== 0) {
        m *= BASE;
        e--;
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
