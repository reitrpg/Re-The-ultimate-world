/**
 * World Creator
 * Upgrade Manager
 */

import Upgrade from "./Upgrade.js";

import eventBus from "../core/eventBus.js";

class UpgradeManager {

    constructor() {

        this.upgrades = new Map();

        this.initialize();

    }

    initialize() {

        if (

            this.upgrades.size > 0

        ) {

            return;

        }

        this.create(

            "divine_revelation",

            "神託",

            1.05,

            100

        );

        this.create(

            "heavenly_blessing",

            "天恵",

            1.10,

            500

        );

        this.create(

            "world_tree",

            "世界樹の加護",

            1.25,

            1000

        );

        this.create(

            "creator_will",

            "創造神の意思",

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

        const upgrade =

            new Upgrade(

                id,

                name,

                multiplier,

                cost

            );

        this.upgrades.set(

            id,

            upgrade

        );

    }

    get(id) {

        return this.upgrades.get(

            id

        );

    }

    getAll() {

        return Array.from(

            this.upgrades.values()

        );

    }

    buy(id) {

        const upgrade =

            this.get(id);

        if (!upgrade) {

            return false;

        }

        const result =

            upgrade.buy();

        if (result) {

            eventBus.emit(

                "upgrade:update"

            );

        }

        return result;

    }

    getTotalMultiplier() {

        let multiplier = 1;

        this.getAll().forEach(

            upgrade => {

                multiplier *=

                    upgrade
                        .getMultiplier();

            }

        );

        return multiplier;

    }

    reset() {

        this.upgrades.clear();

        this.initialize();

        eventBus.emit(

            "upgrade:update"

        );

    }

    toJSON() {

        return this.getAll().map(

            upgrade =>

                upgrade.toJSON()

        );

    }

    load(data) {

        this.reset();

        if (

            !Array.isArray(data)

        ) {

            return;

        }

        data.forEach(

            upgradeData => {

                const upgrade =

                    this.get(

                        upgradeData.id

                    );

                if (upgrade) {

                    upgrade.load(

                        upgradeData

                    );

                }

            }

        );

    }

}

export default new UpgradeManager();