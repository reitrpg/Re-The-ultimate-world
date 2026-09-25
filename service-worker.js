const CACHE_NAME = "world-creator-v18";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./manifest.json",
    "./js/core/main.js",
    "./js/core/game.js",
    "./js/core/save.js",
    "./js/core/eventBus.js",
    "./js/core/errorHandler.js",
    "./js/core/InputManager.js",
    "./js/core/InputActionController.js",
    "./js/number/Constants.js",
    "./js/number/Normalize.js",
    "./js/number/Compare.js",
    "./js/number/Arithmetic.js",
    "./js/number/BigNumber.js",
    "./js/resource/Resource.js",
    "./js/resource/Manager.js",
    "./js/world/World.js",
    "./js/world/Generator.js",
    "./js/world/Manager.js",
    "./js/world/UnlockManager.js",
    "./js/research/Manager.js",
    "./js/research/Research.js",
    "./js/upgrades/Manager.js",
    "./js/upgrades/Upgrade.js",
    "./js/rebirth/Manager.js",
    "./js/settings/Manager.js",
    "./js/debug/Manager.js",
    "./js/ep/Manager.js",
    "./js/converter/Converter.js",
    "./js/utils/Formatter.js",
    "./js/utils/OfflineProgress.js",
    "./js/ui/UI.js",
    "./js/ui/TabUI.js",
    "./js/ui/EPUI.js",
    "./js/ui/ResourceUI.js",
    "./js/ui/WorldUI.js",
    "./js/ui/ResearchUI.js",
    "./js/ui/UpgradeUI.js",
    "./js/ui/ConverterUI.js",
    "./js/ui/RebirthUI.js",
    "./js/ui/SettingsUI.js",
    "./js/ui/DebugUI.js",
    "./js/ui/SaveUI.js",
    "./js/ui/NotificationUI.js",
    "./js/ui/ErrorUI.js",
    "./icon-192.png",
    "./icon-512.png"
];

async function putInCache(request, response) {
    if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
    }
    return response;
}

async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);

    const network = fetch(request)
        .then(response => putInCache(request, response))
        .catch(() => null);

    if (cached) {
        return cached;
    }

    const response = await network;
    if (response) return response;

    throw new Error("World Creator: resource unavailable");
}

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache =>
                Promise.allSettled(
                    FILES_TO_CACHE.map(file => cache.add(file))
                )
            )
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys =>
                Promise.all(
                    keys
                        .filter(key => key !== CACHE_NAME)
                        .map(key => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;

    if (request.method !== "GET") return;

    const url = new URL(request.url);

    // Only cache same-origin application resources.
    if (url.origin !== self.location.origin) return;

    event.respondWith(staleWhileRevalidate(request));
});
