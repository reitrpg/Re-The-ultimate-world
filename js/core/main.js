/**
 * World Creator
 * Main
 */

import SaveManager from "./save.js";
import Game from "./game.js";

import OfflineProgress from "../utils/OfflineProgress.js";

import ResourceManager from "../resource/Manager.js";

import WorldManager from "../world/Manager.js";

import UI from "../ui/UI.js";
import TabUI from "../ui/TabUI.js";
import WorldUI from "../ui/WorldUI.js";
import ResearchUI from "../ui/ResearchUI.js";
import UpgradeUI from "../ui/UpgradeUI.js";
import ConverterUI from "../ui/ConverterUI.js";
import RebirthUI from "../ui/RebirthUI.js";
import SettingsUI from "../ui/SettingsUI.js";
import SaveUI from "../ui/SaveUI.js";
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

    WorldUI.initialize();

    ResearchUI.initialize();

    UpgradeUI.initialize();

    ConverterUI.initialize();

    RebirthUI.initialize();

    SettingsUI.initialize();

    SaveUI.initialize();

    DebugUI.initialize();

}

function initializeGame() {

    const loaded =

        SaveManager.load();

    if (!loaded) {

        initializeResources();

        initializeWorld();

    }

    OfflineProgress.calculate();

    initializeUI();

    SaveManager.startAutoSave();

    Game.start();

}

window.addEventListener(

    "beforeunload",

    () => {

        OfflineProgress.saveTimestamp();

        SaveManager.save();

    }

);

document.addEventListener(

    "DOMContentLoaded",

    () => {

        initializeGame();

    }

);