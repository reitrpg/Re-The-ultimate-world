const CACHE_NAME = "world-creator-v11";

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

function isFreshResourceRequest(request) {
    return (
        request.destination === "document" ||
        request.destination === "style" ||
        request.destination === "script" ||
        request.destination === "worker"
    );
}

async function networkFirst(request) {
    try {
        const freshRequest = new Request(request, {
            cache: "no-store"
        });

        const response = await fetch(freshRequest);

        if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw error;
    }
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);

    if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
    }

    return response;
}

self.addEventListener("install", event => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
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
        caches
            .keys()
            .then(keys =>
                Promise.all(
                    keys.map(key =>
                        key !== CACHE_NAME
                            ? caches.delete(key)
                            : undefined
                    )
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") return;

    event.respondWith(
        isFreshResourceRequest(event.request)
            ? networkFirst(event.request)
            : cacheFirst(event.request)
    );
});
