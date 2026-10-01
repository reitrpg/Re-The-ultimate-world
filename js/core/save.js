import eventBus from "./eventBus.js";
import WorldManager from "../world/Manager.js";
import UnlockManager from "../world/UnlockManager.js";
import ResourceManager from "../resource/Manager.js";
import EPManager from "../ep/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
import RebirthManager from "../rebirth/Manager.js";
import SettingsManager from "../settings/Manager.js";
import StatisticsManager from "../statistics/Manager.js";
import Game from "./game.js";
class SaveManager{
 constructor(){this.key="world_creator_save";this.version=5;this.autoSaveTimer=null;this.clearing=false;}
 createSaveData(){return{version:this.version,timestamp:Date.now(),worlds:WorldManager.toJSON(),worldUnlock:UnlockManager.toJSON(),resources:ResourceManager.toJSON(),ep:EPManager.toJSON(),research:ResearchManager.toJSON(),upgrades:UpgradeManager.toJSON(),rebirth:RebirthManager.toJSON(),settings:SettingsManager.toJSON(),statistics:StatisticsManager.toJSON()};}
 save(){if(this.clearing)return false;try{localStorage.setItem(this.key,JSON.stringify(this.createSaveData()));eventBus.emit("save:success");return true;}catch(error){console.error(error);eventBus.emit("save:error",error);return false;}}
 load(){
  try{
   const raw=localStorage.getItem(this.key);if(!raw)return false;
   const data=JSON.parse(raw);if(!data||typeof data!=="object")throw new Error("セーブデータの形式が不正です");
   WorldManager.load(data.worlds);UnlockManager.load(data.worldUnlock);ResourceManager.load(data.resources);
   EPManager.load(data.ep);ResearchManager.load(data.research);UpgradeManager.load(data.upgrades);
   RebirthManager.load(data.rebirth);SettingsManager.load(data.settings);StatisticsManager.load(data.statistics);
   if(!ResourceManager.exists("plant")||!ResourceManager.exists("metal")||!ResourceManager.exists("magic"))ResourceManager.createDefaultResources();
   eventBus.emit("load:success");return true;
  }catch(error){console.error(error);eventBus.emit("load:error",error);localStorage.removeItem(this.key);return false;}
 }
 clear(){
  this.clearing=true;
  this.stopAutoSave();
  Game.stop();
  WorldManager.clear();
  UnlockManager.reset();
  ResourceManager.clear();
  EPManager.reset();
  ResearchManager.reset();
  UpgradeManager.reset();
  RebirthManager.reset();
  StatisticsManager.reset();
  localStorage.setItem("world_creator_reset_pending", "true");
  localStorage.removeItem(this.key);
  localStorage.removeItem("world_creator_last_time");
  sessionStorage.setItem("world_creator_skip_offline_once", "true");
  eventBus.emit("save:clear");
}
 startAutoSave(){this.stopAutoSave();const interval=SettingsManager.getAutoSaveInterval();if(!Number.isFinite(interval)||interval<=0)return;this.autoSaveTimer=setInterval(()=>this.save(),interval);}
 stopAutoSave(){if(!this.autoSaveTimer)return;clearInterval(this.autoSaveTimer);this.autoSaveTimer=null;}
 restartAutoSave(){this.startAutoSave();}
}
export default new SaveManager();