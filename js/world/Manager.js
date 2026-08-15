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