const CACHE_NAME =
    "world-creator-v1";

const FILES_TO_CACHE = [

    "./",

    "./index.html",

    "./style.css",

    "./manifest.json",

    "./js/core/main.js",

    "./js/core/game.js",

    "./js/core/save.js",

    "./js/core/eventBus.js",

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

    "./js/research/Manager.js",

    "./js/upgrades/Manager.js",

    "./js/settings/Manager.js",

    "./js/debug/Manager.js",

    "./js/ep/Manager.js",

    "./js/converter/Converter.js",

    "./js/ui/UI.js",

    "./js/ui/TabUI.js",

    "./js/ui/ResearchUI.js",

    "./js/ui/UpgradeUI.js",

    "./js/ui/DebugUI.js",

    "./icons/icon-192.png",

    "./icons/icon-512.png"

];

self.addEventListener(

    "install",

    event => {

        event.waitUntil(

            caches.open(
                CACHE_NAME
            )

            .then(

                cache =>

                    cache.addAll(
                        FILES_TO_CACHE
                    )

            )

        );

    }

);

self.addEventListener(

    "activate",

    event => {

        event.waitUntil(

            caches.keys()

            .then(

                keys =>

                    Promise.all(

                        keys.map(

                            key => {

                                if (

                                    key !==
                                    CACHE_NAME

                                ) {

                                    return caches.delete(
                                        key
                                    );

                                }

                            }

                        )

                    )

            )

        );

    }

);

self.addEventListener(

    "fetch",

    event => {

        event.respondWith(

            caches.match(
                event.request
            )

            .then(

                response => {

                    if (
                        response
                    ) {

                        return response;

                    }

                    return fetch(
                        event.request
                    );

                }

            )

        );

    }

);