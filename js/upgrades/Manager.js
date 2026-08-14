/**
 * World Creator
 * Upgrade Manager
 */

import BigNumber from "../number/BigNumber.js";
import EPManager from "../ep/Manager.js";
import eventBus from "../core/eventBus.js";

class UpgradeManager {

    constructor() {

        this.upgrades = new Map();

        this.initialize();

    }

    initialize() {

        this.add({

            id: "production",

            name: "創造神の恩寵",

            level: 0,

            baseCost: 100,

            costMultiplier: 1.6,

            bonus: 1.10

        });

        this.add({

            id: "conversion",

            name: "錬成神の神託",

            level: 0,

            baseCost: 500,

            costMultiplier: 1.8,

            bonus: 1.15

        });

        this.add({

            id: "world",

            name: "世界樹の導き",

            level: 0,

            baseCost: 2000,

            costMultiplier: 2.0,

            bonus: 1.20

        });

        this.add({

            id: "research",

            name: "叡智神の啓示",

            level: 0,

            baseCost: 10000,

            costMultiplier: 2.2,

            bonus: 1.25

        });

        this.add({

            id: "rebirth",

            name: "輪廻神の加護",

            level: 0,

            baseCost: 50000,

            costMultiplier: 2.5,

            bonus: 1.50

        });

    }

    add(data) {

        this.upgrades.set(

            data.id,

            data

        );

    }

    get(id) {

        return this.upgrades.get(id);

    }

    getAll() {

        return Array.from(

            this.upgrades.values()

        );

    }

    getCost(id) {

        const upgrade =

            this.get(id);

        if (!upgrade) {

            return BigNumber.from(0);

        }

        const cost =

            upgrade.baseCost *

            Math.pow(

                upgrade.costMultiplier,

                upgrade.level

            );

        return BigNumber.from(cost);

    }

    buy(id) {

        const upgrade =

            this.get(id);

        if (!upgrade) {

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

        upgrade.level++;

        eventBus.emit(

            "upgrade:update",

            upgrade

        );

        return true;

    }

    getMultiplier(id) {

        const upgrade =

            this.get(id);

        if (!upgrade) {

            return 1;

        }

        return Math.pow(

            upgrade.bonus,

            upgrade.level

        );

    }

    getTotalMultiplier() {

        let multiplier = 1;

        for (

            const upgrade of

            this.upgrades.values()

        ) {

            multiplier *= Math.pow(

                upgrade.bonus,

                upgrade.level

            );

        }

        return multiplier;

    }

    reset() {

        for (

            const upgrade of

            this.upgrades.values()

        ) {

            upgrade.level = 0;

        }

        eventBus.emit(

            "upgrade:reset"

        );

    }

    toJSON() {

        const data = {};

        for (

            const [

                id,

                upgrade

            ]

            of this.upgrades

        ) {

            data[id] = {

                level:

                    upgrade.level

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

            const upgrade =

                this.get(id);

            if (upgrade) {

                upgrade.level =

                    data[id].level;

            }

        }

        eventBus.emit(

            "upgrade:update"

        );

    }

}

export default new UpgradeManager();