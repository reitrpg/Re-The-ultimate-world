/**
 * World Creator
 * Notification UI
 */

import eventBus from "../core/eventBus.js";

class NotificationUI {
    constructor() {
        this.container = null;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        this.initialized = true;
        this.createContainer();
        this.registerEvents();
    }

    createContainer() {
        this.container = document.getElementById("notification-container");

        if (this.container) return;

        this.container = document.createElement("div");
        this.container.id = "notification-container";
        document.body.appendChild(this.container);
    }

    registerEvents() {
        eventBus.on("save:success", () => this.show("保存しました"));
        eventBus.on("load:success", () => this.show("読み込みました"));
        eventBus.on("world:unlock", () => this.show("新しい世界を解放しました"));

        eventBus.on("world:unlock:failed", failure => {
            if (!failure) return;

            switch (failure.code) {
                case "INSUFFICIENT_EP":
                    this.show(
                        "EPが不足しています。必要: " +
                        this.formatValue(failure.required) +
                        " / 現在: " +
                        this.formatValue(failure.current)
                    );
                    break;

                case "EP_CONSUME_FAILED":
                    this.show("EPの消費に失敗しました。");
                    break;

                default:
                    this.show("世界の解放に失敗しました。");
                    break;
            }
        });

        eventBus.on("notification:show", data => {
            if (!data || !data.message) return;
            this.show(data.message);
        });

        eventBus.on("rebirth:update", () => this.show("転生しました"));
    }

    formatValue(value) {
        if (value && typeof value.toString === "function") {
            return value.toString();
        }

        return String(value ?? 0);
    }

    show(message) {
        if (!this.container) return;

        const notification = document.createElement("div");
        notification.className = "notification";
        notification.textContent = message;
        this.container.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
    }
}

export default new NotificationUI();
