/**
 * World Creator
 * Game Loop
 */

import SettingsManager from "../settings/Manager.js";

import WorldManager from "../world/Manager.js";

import eventBus from "./eventBus.js";
import StatisticsManager from "../statistics/Manager.js";
import AchievementManager from "../achievements/Manager.js";
import AutomationManager from "../automation/Manager.js";

class Game {

    constructor() {

        this.interval = null;

        this.lastUpdate = 0;

        this.running = false;

        eventBus.on("settings:update", payload => {
            if (payload?.key === "tickSpeed" && this.running) {
                this.restart();
            }
        });

        AutomationManager.initialize();

    }

    start() {

        if (this.running) {

            return;

        }

        this.running = true;

        this.lastUpdate = Date.now();

        this.interval = setInterval(

            () => {

                this.update();

            },

            SettingsManager.getTickSpeed()

        );

    }

    stop() {

        if (this.interval === null) {
            this.running = false;
            return;
        }

        clearInterval(

            this.interval

        );

        this.interval = null;

        this.running = false;

    }

    restart() {

        this.stop();

        this.start();

    }

    update() {

        const currentTime =
            Date.now();

        const deltaTime =

            (
                currentTime -
                this.lastUpdate
            ) / 1000;

        this.lastUpdate =
            currentTime;

        StatisticsManager.recordOnlineTime(deltaTime);

        WorldManager.update(
            deltaTime
        );

        eventBus.emit("game:update");

    }

}

export default new Game();