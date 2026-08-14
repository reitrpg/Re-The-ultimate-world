/**
 * World Creator
 * Research Manager
 */

import BigNumber from "../number/BigNumber.js";
import EPManager from "../ep/Manager.js";
import eventBus from "../core/eventBus.js";

class ResearchManager {

    constructor() {

        this.researches = new Map();

        this.initialize();

    }

    initialize() {

        this.add({

            id: "agriculture",

            name: "豊穣神の祝福",

            level: 0,

            baseCost: 10,

            costMultiplier: 1.5,

            bonus: 1.05

        });

        this.add({

            id: "mining",

            name: "地脈神の啓示",

            level: 0,

            baseCost: 50,

            costMultiplier: 1.7,

            bonus: 1.10

        });

        this.add({

            id: "magic",

            name: "魔導神の福音",

            level: 0,

            baseCost: 250,

            costMultiplier: 1.9,

            bonus: 1.15

        });

        this.add({

            id: "world",

            name: "創世神の真理",

            level: 0,

            baseCost: 1000,

            costMultiplier: 2.0,

            bonus: 1.25

        });

        this.add({

            id: "rebirth",

            name: "輪廻神の審判",

            level: 0,

            baseCost: 5000,

            costMultiplier: 2.2,

            bonus: 1.50

        });

    }

    add(data) {

        this.researches.set(

            data.id,

            data

        );

    }

    get(id) {

        return this.researches.get(id);

    }

    getAll() {

        return Array.from(

            this.researches.values()

        );

    }

    getCost(id) {

        const research =

            this.get(id);

        if (!research) {

            return BigNumber.from(0);

        }

        const cost =

            research.baseCost *

            Math.pow(

                research.costMultiplier,

                research.level

            );

        return BigNumber.from(cost);

    }

    buy(id) {

        const research =

            this.get(id);

        if (!research) {

            return false;

        }

        const cost =

            this.getCost(id);

        if (

            !EPManager.has(cost)

        ) {

            return false;

        }

        EPManager.consume(cost);

        research.level++;

        eventBus.emit(

            "research:update",

            research

        );

        return true;

    }

    getMultiplier(id) {

        const research =

            this.get(id);

        if (!research) {

            return 1;

        }

        return Math.pow(

            research.bonus,

            research.level

        );

    }

    getTotalMultiplier() {

        let multiplier = 1;

        for (

            const research of

            this.researches.values()

        ) {

            multiplier *= Math.pow(

                research.bonus,

                research.level

            );

        }

        return multiplier;

    }

    reset() {

        for (

            const research of

            this.researches.values()

        ) {

            research.level = 0;

        }

        eventBus.emit(

            "research:reset"

        );

    }

    toJSON() {

        const data = {};

        for (

            const [

                id,

                research

            ]

            of this.researches

        ) {

            data[id] = {

                level:

                    research.level

            };

        }

        return data;

    }

    load(data) {

        if (!data) {

            return;

        }

        for (

            const id in data

        ) {

            const research =

                this.get(id);

            if (research) {

                research.level =

                    data[id].level;

            }

        }

        eventBus.emit(

            "research:update"

        );

    }

}

export default new ResearchManager();