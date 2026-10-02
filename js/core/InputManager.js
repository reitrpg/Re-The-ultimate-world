import eventBus from "./eventBus.js";

class InputManager {
    constructor() {
        this.initialized = false;
        this.activePointers = new Map();
        this.sequence = 0;
        this.diagnostics = this.createDiagnostics();
    }

    createDiagnostics() {
        const existing = window.__WC_INPUT_DIAGNOSTICS__;

        if (existing) return existing;

        const diagnostics = {
            records: [],
            counts: Object.create(null),
            lastSequence: 0,
            record(stage, data = {}) {
                const record = {
                    time: Date.now(),
                    stage,
                    ...data
                };

                this.records.push(record);

                if (this.records.length > 200) {
                    this.records.shift();
                }

                this.counts[stage] = (this.counts[stage] || 0) + 1;
                this.lastSequence = Number(data.sequence || this.lastSequence);
            },
            clear() {
                this.records.length = 0;
                this.counts = Object.create(null);
                this.lastSequence = 0;
            }
        };

        window.__WC_INPUT_DIAGNOSTICS__ = diagnostics;
        return diagnostics;
    }

    initialize() {
        if (this.initialized) return;

        this.initialized = true;

        if (document.documentElement.dataset.inputManagerInitialized === "true") {
            this.diagnostics.record("DUPLICATE_INITIALIZE");
            return;
        }

        document.documentElement.dataset.inputManagerInitialized = "true";

        document.addEventListener("pointerdown", event => {
            if (event.button !== 0) return;
            if (event.isPrimary === false) return;

            const target = this.resolveTarget(event);

            this.diagnostics.record("POINTER_DOWN", {
                pointerId: event.pointerId,
                pointerType: event.pointerType,
                isPrimary: event.isPrimary,
                target: this.describeTarget(target)
            });

            if (!target || target.disabled) return;
            if (this.activePointers.has(event.pointerId)) return;

            this.activePointers.set(event.pointerId, target);

            if (typeof target.setPointerCapture === "function") {
                try {
                    target.setPointerCapture(event.pointerId);
                } catch (_) {}
            }

            event.preventDefault();
        }, true);

        document.addEventListener("pointerup", event => {
            if (event.button !== 0) return;
            if (event.isPrimary === false) return;

            const target = this.activePointers.get(event.pointerId);
            this.activePointers.delete(event.pointerId);

            this.diagnostics.record("POINTER_UP", {
                pointerId: event.pointerId,
                pointerType: event.pointerType,
                isPrimary: event.isPrimary,
                target: this.describeTarget(target)
            });

            if (!target || target.disabled) return;

            event.preventDefault();
            event.stopImmediatePropagation();

            this.dispatch(target, event, "pointer");
        }, true);

        document.addEventListener("pointercancel", event => {
            if (event.isPrimary === false) return;

            this.diagnostics.record("POINTER_CANCEL", {
                pointerId: event.pointerId,
                pointerType: event.pointerType
            });

            this.activePointers.delete(event.pointerId);
        }, true);

        document.addEventListener("click", event => {
            const target = this.resolveTarget(event);
            if (!target) return;

            this.diagnostics.record("NATIVE_CLICK_BLOCKED", {
                target: this.describeTarget(target)
            });

            event.preventDefault();
            event.stopImmediatePropagation();
        }, true);

        document.addEventListener("keydown", event => {
            if (event.repeat) return;
            if (event.key !== "Enter" && event.key !== " ") return;

            const target = this.resolveTarget(event);
            if (!target || target.disabled) return;

            this.diagnostics.record("KEY_DOWN", {
                key: event.key,
                target: this.describeTarget(target)
            });

            event.preventDefault();
            event.stopImmediatePropagation();

            this.dispatch(target, event, "keyboard");
        }, true);

        document.documentElement.style.setProperty(
            "touch-action",
            "manipulation"
        );
    }

    resolveTarget(event) {
        const selectors =
            "[data-action], [data-tab], [data-world-category], [data-upgrade-category], button, [role='button']";

        const path = typeof event.composedPath === "function"
            ? event.composedPath()
            : [];

        for (const node of path) {
            if (node && typeof node.closest === "function") {
                const target = node.closest(selectors);
                if (target) return target;
            }
        }

        const target = event.target;

        return target && typeof target.closest === "function"
            ? target.closest(selectors)
            : null;
    }

    describeTarget(target) {
        if (!target) return null;

        return {
            tag: target.tagName || null,
            id: target.id || null,
            action: target.dataset?.action || null,
            tab: target.dataset?.tab || null,
            worldIndex: target.dataset?.worldIndex || null,
            text: String(target.textContent || "").trim().slice(0, 60)
        };
    }

    dispatch(target, originalEvent, inputType) {
        if (!target || target.disabled) return false;

        const sequence = ++this.sequence;

        const payload = {
            sequence,
            action: target.dataset?.action || null,
            target,
            originalEvent,
            inputType
        };

        this.diagnostics.record("DISPATCH", {
            sequence,
            inputType,
            action: payload.action,
            target: this.describeTarget(target)
        });

        eventBus.emit("input:pressed", payload);

        this.diagnostics.record("DISPATCH_COMPLETE", {
            sequence,
            action: payload.action
        });

        return true;
    }
}

export default new InputManager();
