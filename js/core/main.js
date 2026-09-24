import SaveManager from "./save.js";
import Game from "./game.js";
import OfflineProgress from "../utils/OfflineProgress.js";
import ResourceManager from "../resource/Manager.js";
import WorldManager from "../world/Manager.js";
import UI from "../ui/UI.js";
import InputManager from "./InputManager.js";

function ensureInitialState(){
 if(!ResourceManager.exists("material"))ResourceManager.createDefaultResources();
 if(WorldManager.getCount()===0)WorldManager.create(Date.now().toString());
}
function registerServiceWorker(){
 if("serviceWorker" in navigator)navigator.serviceWorker.register("./service-worker.js").catch(error=>console.warn("Service Worker registration failed:",error));
}
function initializeGame(){
 const loaded=SaveManager.load();
 if(!loaded)ensureInitialState();else ensureInitialState();
 OfflineProgress.calculate();
 UI.initialize();
 InputManager.initialize();
 SaveManager.startAutoSave();
 Game.start();
 registerServiceWorker();
}
window.addEventListener("beforeunload",()=>{OfflineProgress.saveTimestamp();SaveManager.save();});
document.addEventListener("DOMContentLoaded",initializeGame);