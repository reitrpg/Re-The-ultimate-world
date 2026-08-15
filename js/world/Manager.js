/**
 * World Creator
 * World Manager
 */

import World from "./World.js";

import eventBus from "../core/eventBus.js";

class WorldManager {

    constructor() {

        this.worlds = [];

        this.activeWorldIndex = 0;

    }

    create(seed) {

        const world =
            new World(seed);

        this.worlds.push(
            world
        );

        eventBus.emit(
            "world:update"
        );

        return world;

    }

    get(index) {

        return this.worlds[index];

    }

    getAll() {

        return this.worlds;

    }

    getCount() {

        return this.worlds.length;

    }

    getActive() {

        return this.worlds[
            this.activeWorldIndex
        ];

    }

    setActive(index) {

        if (
            index < 0 ||
            index >=
                this.worlds.length
        ) {

            return false;

        }

        this.activeWorldIndex =
            index;

        eventBus.emit(
            "world:update"
        );

        return true;

    }

    update(deltaTime) {

        const world =
            this.getActive();

        if (!world) {

            return;
        }

        world.update(
            deltaTime
        );

        eventBus.emit(
            "world:update"
        );

    }

    clear() {

        this.worlds = [];

        this.activeWorldIndex = 0;

        eventBus.emit(
            "world:update"
        );

    }

    toJSON() {

        return {

            worlds:
                this.worlds.map(

                    world =>

                        world.toJSON()

                ),

            activeWorldIndex:
                this.activeWorldIndex

        };

    }

    load(data) {

        if (!data) {

            return;

        }

        this.worlds = [];

        if (

            Array.isArray(
                data.worlds
            )

        ) {

            data.worlds.forEach(

                worldData => {

                    const world =
                        new World();

                    world.load(
                        worldData
                    );

                    this.worlds.push(
                        world
                    );

                }

            );

        }

        this.activeWorldIndex =

            data.activeWorldIndex ||
            0;

    }

}

export default new WorldManager();