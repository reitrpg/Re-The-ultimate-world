/**
 * World Creator
 * Event Bus
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.listenerSequence = 0;
    }

    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }

        if (!callback.__wcListenerId) {
            Object.defineProperty(callback, "__wcListenerId", {
                value: ++this.listenerSequence,
                enumerable: false,
                configurable: false
            });
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

        if (eventName === "input:pressed") {
            const diagnostics = window.__WC_INPUT_DIAGNOSTICS__;

            diagnostics?.record("EVENT_SEND", {
                listenerCount: callbacks.length,
                sequence: args[0]?.sequence || null,
                action: args[0]?.action || null
            });
        }

        for (const callback of callbacks) {
            try {
                if (eventName === "input:pressed") {
                    const diagnostics = window.__WC_INPUT_DIAGNOSTICS__;

                    diagnostics?.record("EVENT_RECEIVE", {
                        listenerId: callback.__wcListenerId || null,
                        sequence: args[0]?.sequence || null,
                        action: args[0]?.action || null
                    });
                }

                callback(...args);
            } catch (error) {
                console.error(
                    "World Creator event listener failed:",
                    eventName,
                    error
                );

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
