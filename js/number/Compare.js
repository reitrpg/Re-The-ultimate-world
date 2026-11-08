/**
 * World Creator
 * BigNumber Compare
 *
 * Comparison must account for the sign before comparing magnitude.
 */
function compareMagnitude(a, b) {
    if (a.layer > b.layer) return 1;
    if (a.layer < b.layer) return -1;

    if (a.exponent > b.exponent) return 1;
    if (a.exponent < b.exponent) return -1;

    const absA = Math.abs(a.mantissa);
    const absB = Math.abs(b.mantissa);

    if (absA > absB) return 1;
    if (absA < absB) return -1;
    return 0;
}

function getSign(value) {
    if (value.mantissa === 0) return 0;
    return value.mantissa < 0 ? -1 : 1;
}

function compare(a, b) {
    const signA = getSign(a);
    const signB = getSign(b);

    if (signA > signB) return 1;
    if (signA < signB) return -1;
    if (signA === 0) return 0;

    const magnitude = compareMagnitude(a, b);
    return signA > 0 ? magnitude : -magnitude;
}

function equal(a, b) {
    return compare(a, b) === 0;
}

function greater(a, b) {
    return compare(a, b) > 0;
}

function less(a, b) {
    return compare(a, b) < 0;
}

function greaterOrEqual(a, b) {
    return compare(a, b) >= 0;
}

function lessOrEqual(a, b) {
    return compare(a, b) <= 0;
}

export {
    compare,
    equal,
    greater,
    less,
    greaterOrEqual,
    lessOrEqual
};
