/**
 * World Creator
 * Number Formatter
 */

import SettingsManager from "../settings/Manager.js";

class Formatter {
    format(value) {
        if (value === undefined || value === null) {
            return "0";
        }

        const isBigNumber =
            value &&
            typeof value.toNumber === "function" &&
            typeof value.toString === "function" &&
            Number.isInteger(value.layer);

        if (isBigNumber) {
            if (value.layer > 0) {
                return value.toString();
            }

            const format = SettingsManager.get("numberFormat");
            const number = value.toNumber();

            if (!Number.isFinite(number)) {
                return value.toString();
            }

            switch (format) {
                case "standard":
                    return this.standard(number);
                case "engineering":
                    return this.engineering(number);
                default:
                    return this.scientific(number);
            }
        }

        const number = Number(value);

        if (!Number.isFinite(number)) {
            return "∞";
        }

        const format = SettingsManager.get("numberFormat");

        switch (format) {
            case "standard":
                return this.standard(number);
            case "engineering":
                return this.engineering(number);
            default:
                return this.scientific(number);
        }
    }

    scientific(number) {
        if (Math.abs(number) < 1000) {
            return number.toFixed(2);
        }

        return number.toExponential(2);
    }

    engineering(number) {
        if (Math.abs(number) < 1000) {
            return number.toFixed(2);
        }

        const exponent =
            Math.floor(Math.log10(Math.abs(number)) / 3) * 3;

        const mantissa =
            number / Math.pow(10, exponent);

        return mantissa.toFixed(2) + "e" + exponent;
    }

    standard(number) {
        return number.toLocaleString("ja-JP");
    }
}

export default new Formatter();
