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

        const loaded = SaveManager.load();

        // Loading a missing/invalid save must never prevent the game
        // from creating its required initial state.
        if (!loaded || WorldManager.getCount() === 0) {
            ensureInitialState();
        } else {
            ensureInitialState();
        }

        OfflineProgress.calculate();

        // Input must be available before UI modules start.
        // This keeps the input -> event path alive even if a UI module
        // fails during startup.
        InputManager.initialize();
        InputActionController.initialize();
        UI.initialize();
        SaveManager.startAutoSave();
        Game.start();
        registerServiceWorker();
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
