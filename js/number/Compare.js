/**
 * World Creator
 * BigNumber Compare
 */

function compare(a, b) {

    if (
        a.exponent > b.exponent
    ) {

        return 1;

    }

    if (
        a.exponent < b.exponent
    ) {

        return -1;

    }

    if (
        a.mantissa > b.mantissa
    ) {

        return 1;

    }

    if (
        a.mantissa < b.mantissa
    ) {

        return -1;

    }

    return 0;

}

function equal(a, b) {

    return (
        compare(a, b) === 0
    );

}

function greater(a, b) {

    return (
        compare(a, b) > 0
    );

}

function less(a, b) {

    return (
        compare(a, b) < 0
    );

}

function greaterOrEqual(a, b) {

    return (
        compare(a, b) >= 0
    );

}

function lessOrEqual(a, b) {

    return (
        compare(a, b) <= 0
    );

}

export {

    compare,

    equal,

    greater,

    less,

    greaterOrEqual,

    lessOrEqual

};