/**
 * World Creator
 * World Manager
 */

import World from "./World.js";
import WorldGenerator from "./Generator.js";
import eventBus from "../core/eventBus.js";

class WorldManager {

    constructor() {

        this.worlds = [];

        this.activeWorldId = null;

    }

    create(seed) {

        const world =
            WorldGenerator.generate(
                seed
            );

        this.add(world);

        return world;

    }

    add(world) {

        if (
            !(world instanceof World)
        ) {

            return false;

        }

        const exists =
            this.worlds.find(

                item =>
                    item.id === world.id

            );

        if (exists) {

            return exists;

        }

        this.worlds.push(world);

        if (
            this.activeWorldId === null
        ) {

            this.activeWorldId =
                world.id;

        }

        eventBus.emit(
            "world:update",
            world
        );

        return world;

    }

    remove(id) {

        const index =
            this.worlds.findIndex(

                world =>
                    world.id === id

            );

        if (
            index === -1
        ) {

            return false;

        }

        this.worlds.splice(
            index,
            1
        );

        if (
            this.activeWorldId === id
        ) {

            this.activeWorldId =

                this.worlds.length > 0

                    ? this.worlds[0].id

                    : null;

        }

        eventBus.emit(
            "world:update"
        );

        return true;

    }

    get(id) {

        return this.worlds.find(

            world =>
                world.id === id

        );

    }

    getAll() {

        return this.worlds;

    }

    getCount() {

        return this.worlds.length;

    }

    getActive() {

        if (
            this.activeWorldId === null
        ) {

            return null;

        }

        return this.get(
            this.activeWorldId
        );

    }

    setActive(id) {

        const world =
            this.get(id);

        if (!world) {

            return false;

        }

        this.activeWorldId = id;

        eventBus.emit(
            "world:active",
            world
        );

        return true;

    }

    clear() {

        this.worlds = [];

        this.activeWorldId = null;

        eventBus.emit(
            "world:update"
        );

    }

    toJSON() {

        return {

            activeWorldId:
                this.activeWorldId,

            worlds:
                this.worlds.map(

                    world =>
                        world.toJSON()

                )

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

            this.worlds =

                data.worlds.map(

                    world =>

                        World.fromJSON(
                            world
                        )

                );

        }

        this.activeWorldId =
            data.activeWorldId;

        eventBus.emit(
            "world:update"
        );

    }

}

export default new WorldManager();