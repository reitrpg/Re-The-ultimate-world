/**
 * World Creator
 * BigNumber Normalize
 */

import {

    BASE,

    MIN_EXPONENT,

    MAX_EXPONENT

}

from "./Constants.js";

function normalize(
    mantissa,
    exponent
) {

    let m =
        Number(mantissa) || 0;

    let e =
        Number(exponent) || 0;

    if (
        m === 0
    ) {

        return {

            mantissa: 0,

            exponent: 0

        };

    }

    while (
        Math.abs(m) >= BASE
    ) {

        m /= BASE;

        e++;

    }

    while (
        Math.abs(m) < 1 &&
        m !== 0
    ) {

        m *= BASE;

        e--;

    }

    if (
        e < MIN_EXPONENT
    ) {

        e =
            MIN_EXPONENT;

    }

    if (
        e > MAX_EXPONENT
    ) {

        e =
            MAX_EXPONENT;

    }

    return {

        mantissa: m,

        exponent: e

    };

}

export default normalize;