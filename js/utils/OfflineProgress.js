/**
 * World Creator
 * Offline Progress
 */

import WorldManager from "../world/Manager.js";
import ResourceManager from "../resource/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";

class OfflineProgress {

    constructor() {

        this.maxOfflineTime =

            1000 * 60 * 60 * 24;

    }

    saveTimestamp() {

        localStorage.setItem(

            "world_creator_last_time",

            Date.now()

        );

    }

    getTimestamp() {

        return Number(

            localStorage.getItem(

                "world_creator_last_time"

            )

        );

    }

    calculate() {

        const lastTime =

            this.getTimestamp();

        if (!lastTime) {

            this.saveTimestamp();

            return;

        }

        const currentTime =
            Date.now();

        let elapsed =

            currentTime - lastTime;

        elapsed = Math.min(

            elapsed,

            this.maxOfflineTime

        );

        const seconds =

            Math.floor(

                elapsed / 1000

            );

        if (seconds <= 0) {

            this.saveTimestamp();

            return;

        }

        const world =
            WorldManager.getActive();

        if (!world) {

            this.saveTimestamp();

            return;

        }

        let multiplier =

            world
                .getTotalMultiplier()
                .toNumber();

        multiplier *=

            ResearchManager
                .getTotalMultiplier();

        multiplier *=

           