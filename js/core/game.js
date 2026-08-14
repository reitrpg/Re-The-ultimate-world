/**
 * World Creator
 * Game Manager
 */

import eventBus from "./eventBus.js";

import SettingsManager from "../settings/Manager.js";

import ResourceManager from "../resource/Manager.js";

import ResearchManager from "../research/Manager.js";

import UpgradeManager from "../upgrades/Manager.js";

import WorldManager from "../world/Manager.js";

class Game {

    constructor() {

        this.isRunning = false;

        this.timer = null;

    }

    start() {

        if (this.isRunning) {

            return;

        }

        this.isRunning = true;

        const tickSpeed =
            SettingsManager.getTickSpeed();

        this.timer = setInterval(

            () => {

                this.tick();

            },

            tickSpeed

        );

        eventBus.emit(
            "game:start"
        );

    }

    stop() {

        if (!this.isRunning) {

            return;

        }

        clearInterval(
            this.timer
        );

        this.timer = null;

        this.isRunning = false;

        eventBus.emit(
            "game:stop"
        );

    }

    restart() {

        this.stop();

        this.start();

    }

    tick() {

        const world =
            WorldManager.getActive();

        if (!world) {

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

            UpgradeManager
                .getTotalMultiplier();

        ResourceManager.produce(
            multiplier
        );

        eventBus.emit(
            "game:tick"
        );

    }

    pause() {

        this.stop();

    }

    resume() {

        this.start();

    }

}

export default new Game();