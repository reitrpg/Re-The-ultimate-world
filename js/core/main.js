import ErrorHandler from "./errorHandler.js";

const APP_VERSION = "0.0.64";
const SERVICE_WORKER_VERSION = "59";

async function loadModule(path) {
    try {
        const module = await import(path);
        return module.default ?? module;
    } catch (error) {
        console.error("World Creator module load failed:", path, error);
        try {
            ErrorHandler.record(error);
        } catch (_) {}
        return null;
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

async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    try {
        const hadController = Boolean(navigator.serviceWorker.controller);

        if (hadController) {
            navigator.serviceWorker.addEventListener(
                "controllerchange",
                () => window.location.reload(),
                { once: true }
            );
        }

        const registration = await navigator.serviceWorker.register(
            "./service-worker.js?v=" + SERVICE_WORKER_VERSION
        );

        if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
    } catch (error) {
        console.warn("Service Worker registration failed:", error);
        ErrorHandler.record(error);
    }
}

const runtime = {};

async function initializeGame() {
    try {
        ErrorHandler.initialize();
        setBootVersion();

        const SaveManager = await loadModule("./save.js");
        const Game = await loadModule("./game.js");
        const OfflineProgress = await loadModule("../utils/OfflineProgress.js");
        const ResourceManager = await loadModule("../resource/Manager.js");
        const InputManager = await loadModule("./InputManager.js");
        const InputActionController = await loadModule("./InputActionController.js");
        const UI = await loadModule("../ui/UI.js");

        runtime.SaveManager = SaveManager;
        runtime.OfflineProgress = OfflineProgress;

        if (!SaveManager || !Game || !ResourceManager || !InputManager || !InputActionController || !UI) {
            throw new Error("World Creator: core module initialization failed");
        }

        const resetPending =
            localStorage.getItem("world_creator_reset_pending") === "true";

        if (resetPending) {
            localStorage.removeItem("world_creator_save");
            localStorage.removeItem("world_creator_last_time");
            sessionStorage.setItem("world_creator_skip_offline_once", "true");
        }

        SaveManager.load();

        if (
            !ResourceManager.exists("plant") ||
            !ResourceManager.exists("metal") ||
            !ResourceManager.exists("magic")
        ) {
            ResourceManager.createDefaultResources();
        }

        if (resetPending) {
            localStorage.removeItem("world_creator_reset_pending");
        }

        const skipOffline =
            sessionStorage.getItem("world_creator_skip_offline_once") === "true";

        if (skipOffline) {
            sessionStorage.removeItem("world_creator_skip_offline_once");
        } else if (OfflineProgress) {
            OfflineProgress.calculate();
        }

        InputManager.initialize();
        InputActionController.initialize();
        await UI.initialize();

        SaveManager.startAutoSave();
        Game.start();

        document.documentElement.dataset.appReady = "true";
        registerServiceWorker();
    } catch (error) {
        ErrorHandler.record(error);
        console.error("World Creator initialization failed:", error);

        const version = document.getElementById("app-version");
        if (version) {
            version.textContent = "World Creator v" + APP_VERSION + " / 起動エラー";
            version.dataset.booted = "error";
        }
    }
}

window.addEventListener("beforeunload", async () => {
    const clearing =
        sessionStorage.getItem("world_creator_skip_offline_once") === "true" ||
        localStorage.getItem("world_creator_reset_pending") === "true";

    if (clearing) return;

    try {
        if (runtime.OfflineProgress) {
            runtime.OfflineProgress.saveTimestamp();
        }
        if (runtime.SaveManager) {
            runtime.SaveManager.save();
        }
    } catch (error) {
        console.error("World Creator shutdown save failed:", error);
    }
});

document.addEventListener("DOMContentLoaded", initializeGame);
