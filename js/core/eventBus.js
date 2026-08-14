/**
 * World Creator
 * Event Bus
 */

class EventBus {

    constructor() {

        this.events = new Map();

    }

    on(eventName, callback) {

        if (!this.events.has(eventName)) {

            this.events.set(
                eventName,
                new Set()
            );

        }

        this.events
            .get(eventName)
            .add(callback);

    }

    once(eventName, callback) {

        const wrapper = (...args) => {

            callback(...args);

            this.off(
                eventName,
                wrapper
            );

        };

        this.on(
            eventName,
            wrapper
        );

    }

    off(eventName, callback) {

        if (!this.events.has(eventName)) {

            return;

        }

        this.events
            .get(eventName)
            .delete(callback);

        if (
            this.events
                .get(eventName)
                .size === 0
        ) {

            this.events.delete(
                eventName
            );

        }

    }

    emit(eventName, ...args) {

        if (!this.events.has(eventName)) {

            return;

        }

        const callbacks = Array.from(

            this.events.get(
                eventName
            )

        );

        for (const callback of callbacks) {

            callback(...args);

        }

    }

    clear(eventName = null) {

        if (eventName === null) {

            this.events.clear();

            return;

        }

        this.events.delete(
            eventName
        );

    }

}

export default new EventBus();