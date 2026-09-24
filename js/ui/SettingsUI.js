import eventBus from "../core/eventBus.js";
import SettingsManager from "../settings/Manager.js";
import Game from "../core/game.js";
import SaveManager from "../core/save.js";
class SettingsUI{
 constructor(){this.initialized=false;}
 initialize(){if(this.initialized)return;this.initialized=true;this.registerControls();this.registerEvents();this.render();}
 getElement(id){return document.getElementById(id);}
 registerControls(){
  const n=this.getElement("settings-number-format");if(n)n.addEventListener("change",e=>SettingsManager.set("numberFormat",e.target.value));
  const t=this.getElement("settings-tick-speed");if(t)t.addEventListener("change",e=>{if(SettingsManager.set("tickSpeed",e.target.value))Game.restart();else this.render();});
  const a=this.getElement("settings-autosave");if(a)a.addEventListener("change",e=>{if(SettingsManager.set("autoSaveInterval",e.target.value))SaveManager.restartAutoSave();else this.render();});
  const d=this.getElement("settings-debug");if(d)d.addEventListener("change",e=>SettingsManager.set("debugMode",e.target.checked));
  const s=this.getElement("settings-speedrun");if(s)s.addEventListener("change",e=>SettingsManager.set("speedRunMode",e.target.checked));
  const l=this.getElement("settings-language");if(l)l.addEventListener("change",e=>SettingsManager.set("language",e.target.value));
 }
 registerEvents(){eventBus.on("settings:update",()=>this.render());}
 render(){const s=SettingsManager.getAll();const n=this.getElement("settings-number-format"),t=this.getElement("settings-tick-speed"),a=this.getElement("settings-autosave"),d=this.getElement("settings-debug"),sr=this.getElement("settings-speedrun"),l=this.getElement("settings-language");if(n)n.value=s.numberFormat;if(t)t.value=s.tickSpeed;if(a)a.value=s.autoSaveInterval;if(d)d.checked=Boolean(s.debugMode);if(sr)sr.checked=Boolean(s.speedRunMode);if(l)l.value=s.language;}
}
export default new SettingsUI();