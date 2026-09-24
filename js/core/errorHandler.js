/**
 * World Creator
 * Error Handler
 */

import eventBus from "./eventBus.js";

class ErrorHandler {
    constructor() {
        this.logs = [];
        this.maxLogs = 100;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;

        window.addEventListener("error", event => {
            this.record(event.error || new Error(event.message));
        });

        window.addEventListener("unhandledrejection", event => {
            const reason = event.reason instanceof Error
                ? event.reason
                : new Error(String(event.reason));

            this.record(reason);
        });
    }

    record(error) {
        const normalized = error instanceof Error
            ? error
            : new Error(String(error));

        const entry = {
            time: Date.now(),
            message: normalized.message || String(normalized),
            stack: normalized.stack || ""
        };

        this.logs.push(entry);

        if (this.logs.length > this.maxLogs) {
            this.logs.splice(0, this.logs.length - this.maxLogs);
        }

        eventBus.emit("error:update", entry);
        return entry;
    }

    getLogs() {
        return this.logs.map(log => ({ ...log }));
    }

    clear() {
        this.logs = [];
        eventBus.emit("error:update");
    }
}

export default new ErrorHandler();
