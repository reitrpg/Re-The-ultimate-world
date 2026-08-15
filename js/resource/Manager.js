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

    create(resource) {

        this.resources.set(

            resource.id,

            resource

        );

        eventBus.emit(

            "resource:update"

        );

        return resource;

    }

    createDefaultResources() {

        if (

            this.exists(
                "material"
            )

        ) {

            return;

        }

        this.create(

            new Resource(

                "material",

                "素材",

                0,

                0

            )

        );

    }

    get(id) {

        return this.resources.get(
            id
        );

    }

    getAll() {

        return Array.from(

            this.resources.values()

        );

    }

    exists(id) {

        return this.resources.has(
            id
        );

    }

    add(
        id,
        amount
    ) {

        const resource =
            this.get(id);

        if (!resource) {

            return false;

        }

        resource.amount =

            resource.amount.add(
                amount
            );

        eventBus.emit(

            "resource:update"

        );

        return true;

    }

    consume(
        id,
        amount
    ) {

        const resource =
            this.get(id);

        if (!resource) {

            return false;

        }

        const cost =

            BigNumber.from(
                amount
            );

        if (

            resource.amount.lt(
                cost
            )

        ) {

            return false;

        }

        resource.amount =

            resource.amount.subtract(
                cost
            );

        eventBus.emit(

            "resource:update"

        );

        return true;

    }

    has(
        id,
        amount
    ) {

        const resource =
            this.get(id);

        if (!resource) {

            return false;

        }

        return resource.amount.gte(
            amount
        );

    }

    produce(
        amount
    ) {

        const resource =
            this.get(
                "material"
            );

        if (!resource) {

            return;
        }

        resource.amount =

            resource.amount.add(
                amount
            );

        eventBus.emit(

            "resource:update"

        );

    }

    clear() {

        this.resources.clear();

        this.createDefaultResources();

        eventBus.emit(

            "resource:update"

        );

    }

    toJSON() {

        return this.getAll().map(

            resource =>

                resource.toJSON()

        );

    }

    load(data) {

        this.resources.clear();

        if (

            !Array.isArray(
                data
            )

        ) {

            this.createDefaultResources();

            return;

        }

        data.forEach(

            resourceData => {

                const resource =
                    new Resource();

                resource.load(
                    resourceData
                );

                this.resources.set(

                    resource.id,

                    resource

                );

            }

        );

    }

}

export default new ResourceManager();