import eventBus from "./eventBus.js";

class InputManager {
    constructor() {
        this.initialized = false;
        this.lastDispatchTarget = null;
        this.lastDispatchTime = 0;
        this.duplicateGuardMs = 300;
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;

        // 物理入力はclickを正規経路にする。
        // pointerup + clickの併用は、タッチ環境で同一操作を二重処理する原因になる。
        document.addEventListener("click", event => {
            this.handleClick(event);
        }, true);

        // ネイティブbuttonはブラウザがEnter/Spaceからclickを発火するため、
        // 独自キーボード発火を行わない。
        // role="button"だけはブラウザ依存のためEnter/Spaceを補完する。
        document.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;

            const target = this.resolveTarget(event);
            if (!target || target.disabled) return;
            if (!target.matches("[role='button']")) return;

            event.preventDefault();
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

    handleClick(event) {
        const target = this.resolveTarget(event);

        if (!target || target.disabled) return;

        const now = Date.now();

        if (
            target === this.lastDispatchTarget &&
            now - this.lastDispatchTime < this.duplicateGuardMs
        ) {
            return;
        }

        this.lastDispatchTarget = target;
        this.lastDispatchTime = now;

        this.dispatch(target, event, "click");
    }

    dispatch(target, originalEvent, inputType) {
        if (!target || target.disabled) return false;

        const payload = {
            action: target.dataset?.action || null,
            target,
            originalEvent,
            inputType
        };

        eventBus.emit("input:pressed", payload);

        if (payload.action) {
            eventBus.emit(payload.action, payload);
        }

        return true;
    }
}

export default new InputManager();
