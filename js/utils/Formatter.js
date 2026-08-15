/**
 * World Creator
 * Number Formatter
 */

import SettingsManager from "../settings/Manager.js";

class Formatter {

    format(value) {

        if (
            value === undefined ||
            value === null
        ) {

            return "0";

        }

        const number =

            typeof value.toNumber ===
            "function"

                ? value.toNumber()

                : Number(value);

        if (

            !Number.isFinite(number)

        ) {

            return "∞";

        }

        const format =

            SettingsManager.get(
                "numberFormat"
            );

        switch (format) {

            case "scientific":

                return this.scientific(
                    number
                );

            case "engineering":

                return this.engineering(
                    number
                );

            case "standard":

                return this.standard(
                    number
                );

            default:

                return this.scientific(
                    number
                );

        }

    }

    scientific(number) {

        if (
            Math.abs(number) < 1000
        ) {

            return number.toFixed(2);

        }

        return number.toExponential(
            2
        );

    }

    engineering(number) {

        if (
            Math.abs(number) < 1000
        ) {

            return number.toFixed(2);

        }

        const exponent =

            Math.floor(

                Math.log10(
                    Math.abs(number)
                ) / 3

            ) * 3;

        const mantissa =

            number /

            Math.pow(
                10,
                exponent
            );

        return (

            mantissa.toFixed(2) +

            "e" +

            exponent

        );

    }

    standard(number) {

        return number.toLocaleString(
            "ja-JP"
        );

    }

}

export default new Formatter();