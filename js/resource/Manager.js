/**
 * World Creator
 * Resource Manager
 */

import Resource from "./Resource.js";
import BigNumber from "../number/BigNumber.js";
import eventBus from "../core/eventBus.js";

class ResourceManager {

    constructor() {

        this.resources = new Map();

    }

    register(
        id,
        name,
        amount = 0,
        production = 0
    ) {

        if (
            this.resources.has(id)
        ) {

            return this.resources.get(id);

        }

        const resource =
            new Resource(
                id,
                name,
                amount,
                production
            );

        this.resources.set(
            id,
            resource
        );

        eventBus.emit(
            "resource:register",
            resource
        );

        return resource;

    }

    get(id) {

        return this.resources.get(id);

    }

    getAll() {

        return Object.fromEntries(
            this.resources
        );

    }

    exists(id) {

        return this.resources.has(id);

    }

    add(
        id,
        value
    ) {

        const resource =
            this.get(id);

        if (!resource) {

            return false;

        }

        resource.add(value);

        eventBus.emit(
            "resource:update",
            resource
        );

        return true;

    }

    consume(
        id,
        value
    ) {

        const resource =
            this.get(id);

        if (!resource) {

            return false;

        }

        const result =
            resource.subtract(
                value
            );

        if (result) {

            eventBus.emit(
                "resource:update",
                resource
            );

        }

        return result;

    }

    has(
        id,
        value
    ) {

        const resource =
            this.get(id);

        if (!resource) {

            return false;

        }

        return resource.has(
            value
        );

    }

    produce(
        multiplier = 1
    ) {

        for (
            const resource
            of this.resources.values()
        ) {

            resource.produce(
                multiplier
            );

        }

        eventBus.emit(
            "resource:update"
        );

    }

    remove(id) {

        const result =
            this.resources.delete(
                id
            );

        if (result) {

            eventBus.emit(
                "resource:remove",
                id
            );

        }

        return result;

    }

    clear() {

        this.resources.clear();

        eventBus.emit(
            "resource:clear"
        );

    }

    toJSON() {

        const data = {};

        for (
            const [id, resource]
            of this.resources
        ) {

            data[id] =
                resource.toJSON();

        }

        return data;

    }

    load(data) {

        if (!data) {

            return;

        }

        this.clear();

        for (
            const id in data
        ) {

            this.resources.set(
                id,
                Resource.fromJSON(
                    data[id]
                )
            );

        }

        eventBus.emit(
            "resource:update"
        );

    }

    createDefaultResources() {

        this.register(
            "material",
            "素材",
            0,
            new BigNumber(
                1,
                0
            )
        );

    }

}

export default new ResourceManager();