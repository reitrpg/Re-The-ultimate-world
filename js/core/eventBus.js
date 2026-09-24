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
            this.events.set(eventName, new Set());
        }

        this.events.get(eventName).add(callback);
    }

    once(eventName, callback) {
        const wrapper = (...args) => {
            try {
                callback(...args);
            } finally {
                this.off(eventName, wrapper);
            }
        };

        this.on(eventName, wrapper);
    }

    off(eventName, callback) {
        if (!this.events.has(eventName)) return;

        this.events.get(eventName).delete(callback);

        if (this.events.get(eventName).size === 0) {
            this.events.delete(eventName);
        }
    }

    emit(eventName, ...args) {
        const listeners = this.events.get(eventName);
        if (!listeners) return;

        const callbacks = Array.from(listeners);

        for (const callback of callbacks) {
            try {
                callback(...args);
            } catch (error) {
                // One broken listener must not prevent the remaining
                // listeners or the input pipeline from running.
                console.error("World Creator event listener failed:", eventName, error);

                queueMicrotask(() => {
                    throw error;
                });
            }
        }
    }

    clear(eventName = null) {
        if (eventName === null) {
            this.events.clear();
            return;
        }

        this.events.delete(eventName);
    }
}

export default new EventBus();
