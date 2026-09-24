import SaveManager from "./save.js";
import Game from "./game.js";
import OfflineProgress from "../utils/OfflineProgress.js";
import ResourceManager from "../resource/Manager.js";
import WorldManager from "../world/Manager.js";
import UI from "../ui/UI.js";
import InputManager from "./InputManager.js";
import InputActionController from "./InputActionController.js";
import ErrorHandler from "./errorHandler.js";

const APP_VERSION = "0.0.24";

function ensureInitialState() {
    if (!ResourceManager.exists("plant") || !ResourceManager.exists("metal") || !ResourceManager.exists("magic")) {
        ResourceManager.createDefaultResources();
    }

    if (WorldManager.getCount() === 0) {
        WorldManager.create(Date.now().toString());
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

    navigator.serviceWorker
        .register("./service-worker.js?v=16")
        .then(registration => registration.update())
        .catch(error => {
            console.warn("Service Worker registration failed:", error);
            ErrorHandler.record(error);
        });
}

function initializeGame() {
    try {
        ErrorHandler.initialize();
        setBootVersion();

        // Start SW update without making application startup depend on it.
        registerServiceWorker();

        SaveManager.load();
        ensureInitialState();
        OfflineProgress.calculate();

        InputManager.initialize();
        InputActionController.initialize();
        UI.initialize();

        SaveManager.startAutoSave();
        Game.start();

        document.documentElement.dataset.appReady = "true";
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
    OfflineProgress.saveTimestamp();
    SaveManager.save();
});

document.addEventListener("DOMContentLoaded", initializeGame);
