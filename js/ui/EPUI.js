import EPManager from "../ep/Manager.js";
import Formatter from "../utils/Formatter.js";
import eventBus from "../core/eventBus.js";

const DIAGNOSTIC_KEY = "world_creator_ep_diagnostics";
const MAX_ENTRIES = 100;

class EPUI {
    constructor() {
        this.initialized = false;
        this.renderCount = 0;
        this.eventCount = 0;
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;
        eventBus.on("ep:update", () => {
            this.eventCount += 1;
            this.render();
        });
        this.render();
    }

    safeValue(value) {
        try {
            if (value && typeof value.toJSON === "function") return value.toJSON();
            return String(value);
        } catch (error) {
            return "[値の取得に失敗: " + String(error?.message || error) + "]";
        }
    }

    record(status, details = {}) {
        try {
            const previous = JSON.parse(localStorage.getItem(DIAGNOSTIC_KEY) || "[]");
            const entries = Array.isArray(previous) ? previous : [];
            entries.push({
                time: new Date().toISOString(),
                status,
                renderCount: this.renderCount,
                eventCount: this.eventCount,
                ...details
            });
            localStorage.setItem(DIAGNOSTIC_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
        } catch (error) {
            console.warn("[EPUI] 診断情報の保存に失敗:", error);
        }
    }

    render() {
        let ep;
        try {
            ep = EPManager.get();
            const element = document.getElementById("ep-value");
            if (!element) {
                this.record("element_missing", { message: "#ep-value が見つかりません" });
                return;
            }

            const internalValue = this.safeValue(ep);
            const displayValue = Formatter.format(ep);
            element.textContent = displayValue;
            this.renderCount += 1;
            this.record("updated", { internalValue, displayValue });
        } catch (error) {
            this.record("render_error", {
                message: String(error?.message || error),
                internalValue: this.safeValue(ep),
                stack: String(error?.stack || "").slice(0, 2000)
            });
            console.error("[EPUI] EP表示更新エラー:", error);
        }
    }
}

export default new EPUI();