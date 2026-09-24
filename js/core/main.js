import SaveManager from "./save.js";
import Game from "./game.js";
import OfflineProgress from "../utils/OfflineProgress.js";
import ResourceManager from "../resource/Manager.js";
import WorldManager from "../world/Manager.js";
import UI from "../ui/UI.js";
import InputManager from "./InputManager.js";
import InputActionController from "./InputActionController.js";
import ErrorHandler from "./errorHandler.js";

function ensureInitialState() {
    if (!ResourceManager.exists("material")) {
        ResourceManager.createDefaultResources();
    }

    if (WorldManager.getCount() === 0) {
        WorldManager.create(Date.now().toString());
    }
}

function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
        return;
    }

    navigator.serviceWorker
        .register("./service-worker.js")
        .then(registration => registration.update())
        .catch(error => {
            console.warn("Service Worker registration failed:", error);
            ErrorHandler.record(error);
        });
}

function initializeGame() {
    try {
        ErrorHandler.initialize();

        // Update the service worker before application initialization.
        // This reduces the chance that an old cached application remains
        // in control of the page after a deployment.
        registerServiceWorker();

        SaveManager.load();
        ensureInitialState();
        OfflineProgress.calculate();

        InputManager.initialize();
        InputActionController.initialize();
        UI.initialize();

        SaveManager.startAutoSave();
        Game.start();
    } catch (error) {
        ErrorHandler.record(error);
        console.error("World Creator initialization failed:", error);
    }
}

window.addEventListener("beforeunload", () => {
    OfflineProgress.saveTimestamp();
    SaveManager.save();
});

document.addEventListener("DOMContentLoaded", initializeGame);
