/**
 * World Creator
 * Main
 */

import SaveManager from "./save.js";
import Game from "./game.js";

import ResourceManager from "../resource/Manager.js";

import WorldManager from "../world/Manager.js";

import UI from "../ui/UI.js";
import TabUI from "../ui/TabUI.js";
import ResearchUI from "../ui/ResearchUI.js";
import UpgradeUI from "../ui/UpgradeUI.js";
import DebugUI from "../ui/DebugUI.js";

function initializeResources() {

    if (

        ResourceManager.exists(
            "material"
        )

    ) {

        return;

    }

    ResourceManager.createDefaultResources();

}

function initializeWorld() {

    if (

        WorldManager.getCount() > 0

    ) {

        return;

    }

    WorldManager.create(

        Date.now().toString()

    );

}

function initializeUI() {

    UI.initialize();

    TabUI.initialize();

    ResearchUI.initialize();

    UpgradeUI.initialize();

    DebugUI.initialize();

}

function initializeGame() {

    const loaded =

        SaveManager.load();

    if (!loaded) {

        initializeResources();

        initializeWorld();

    }

    initializeUI();

    SaveManager.startAutoSave();

    Game.start();

}

document.addEventListener(

    "DOMContentLoaded",

    () => {

        initializeGame();

    }

);