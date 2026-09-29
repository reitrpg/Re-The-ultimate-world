import SaveManager from "./save.js";
import Game from "./game.js";
import OfflineProgress from "../utils/OfflineProgress.js";
import ResourceManager from "../resource/Manager.js";
import WorldManager from "../world/Manager.js";
import UI from "../ui/UI.js";
import InputManager from "./InputManager.js";
import InputActionController from "./InputActionController.js";
import ErrorHandler from "./errorHandler.js";

const APP_VERSION = "0.0.33";
const SERVICE_WORKER_VERSION = "28";

function ensureInitialState() {
    if (!ResourceManager.exists("plant") || !ResourceManager.exists("metal") || !ResourceManager.exists("magic")) {
        ResourceManager.createDefaultResources();
    }

}

function setBootVersion() {
    const version = document.getElementById("app-version");

    if (version) {
        version.textContent = "World Creator v" + APP_VERSION;
        version.dataset.booted = "true";
    }

    document.documentElement.dataset.appVersion = APP_VERSION;
}

function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
        return;
    }

    const hadController = Boolean(navigator.serviceWorker.controller);

    if (hadController) {
        navigator.serviceWorker.addEventListener(
            "controllerchange",
            () => {
                window.location.reload();
            },
            { once: true }
        );
    }

    navigator.serviceWorker
        .register("./service-worker.js?v=" + SERVICE_WORKER_VERSION)
        .then(registration => {
            if (registration.waiting) {
                registration.waiting.postMessage({
                    type: "SKIP_WAITING"
                });
            }
        })
        .catch(error => {
            console.warn("Service Worker registration failed:", error);
            ErrorHandler.record(error);
        });
}

function scheduleServiceWorkerRegistration() {
    if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(registerServiceWorker, { timeout: 3000 });
        return;
    }

    window.setTimeout(registerServiceWorker, 1000);
}

function initializeGame() {
    try {
        ErrorHandler.initialize();
        setBootVersion();

        const resetPending =
            localStorage.getItem("world_creator_reset_pending") === "true";

        if (resetPending) {
            localStorage.removeItem("world_creator_save");
            localStorage.removeItem("world_creator_last_time");
            sessionStorage.setItem(
                "world_creator_skip_offline_once",
                "true"
            );
        }

        SaveManager.load();
        ensureInitialState();

        if (resetPending) {
            localStorage.removeItem("world_creator_reset_pending");
        }
        const skipOfflineProgress = sessionStorage.getItem("world_creator_skip_offline_once") === "true";
        if (skipOfflineProgress) {
            sessionStorage.removeItem("world_creator_skip_offline_once");
        } else {
            OfflineProgress.calculate();
        }

        InputManager.initialize();
        InputActionController.initialize();
        UI.initialize();

        SaveManager.startAutoSave();
        Game.start();

        document.documentElement.dataset.appReady = "true";

        scheduleServiceWorkerRegistration();
    } catch (error) {
        ErrorHandler.record(error);
        console.error("World Creator initialization failed:", error);

        const version = document.getElementById("app-version");

        if (version) {
            version.textContent =
                "World Creator v" +
                APP_VERSION +
                " / 起動エラー";
            version.dataset.booted = "error";
        }
    }
}

window.addEventListener("beforeunload", () => {
    const clearing =
        sessionStorage.getItem("world_creator_skip_offline_once") === "true" ||
        localStorage.getItem("world_creator_reset_pending") === "true";

    if (!clearing) {
        OfflineProgress.saveTimestamp();
        SaveManager.save();
    }
});

document.addEventListener("DOMContentLoaded", initializeGame);
