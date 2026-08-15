/**
 * World Creator
 * Research Manager
 */

import Research from "./Research.js";

import BigNumber from "../number/BigNumber.js";

import eventBus from "../core/eventBus.js";

class ResearchManager {

    constructor() {

        this.researches = new Map();

        this.initialize();

    }

    initialize() {

        if (

            this.researches.size > 0

        ) {

            return;

        }

        this.create(

            "agriculture",
            "農業",
            1.05,
            100

        );

        this.create(

            "mining",
            "採掘",
            1.10,
            250

        );

        this.create(

            "magic",
            "魔法",
            1.15,
            500

        );

        this.create(

            "world",
            "世界",
            1.25,
            1000

        );

        this.create(

            "rebirth",
            "転生",
            1.50,
            5000

        );

    }

    create(

        id,
        name,
        multiplier,
        cost

    ) {

        const research =

            new Research(

                id,
                name,
                multiplier,
                cost

            );

        this.researches.set(

            id,
            research

        );

    }

    get(id) {

        return this.researches.get(
            id
        );

    }

    getAll() {

        return Array.from(

            this.researches.values()

        );

    }

    buy(id) {

        const research =
            this.get(id);

        if (!research) {

            return false;

        }

        const result =
            research.buy();

        if (result) {

            eventBus.emit(

                "research:update"

            );

        }

        return result;

    }

    getTotalMultiplier() {

        let multiplier =
            1;

        this.getAll().forEach(

            research => {

                multiplier *=

                    research
                        .getMultiplier();

            }

        );

        return multiplier;

    }

    reset() {

        this.researches.clear();

        this.initialize();

        eventBus.emit(

            "research:update"

        );

    }

    toJSON() {

        return this.getAll().map(

            research =>

                research.toJSON()

        );

    }

    load(data) {

        this.reset();

        if (

            !Array.isArray(
                data
            )

        ) {

            return;

        }

        data.forEach(

            researchData => {

                const research =
                    this.get(

                        researchData.id

                    );

                if (research) {

                    research.load(
                        researchData
                    );

                }

            }

        );

    }

}

export default new ResearchManager();