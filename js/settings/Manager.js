import eventBus from "../core/eventBus.js";
export const DEFAULT_SETTINGS=Object.freeze({numberFormat:"scientific",tickSpeed:1000,autoSaveInterval:30000,debugMode:false,speedRunMode:false,language:"ja"});
class SettingsManager{
 constructor(){this.settings={...DEFAULT_SETTINGS};}
 get(key){return this.settings[key];}
 getAll(){return{...this.settings};}
 set(key,value){
  if(!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS,key))return false;
  if(key==="tickSpeed"){const n=Number(value);if(!Number.isFinite(n)||n<=0)return false;value=n;}
  if(key==="autoSaveInterval"){const n=Number(value);if(!Number.isFinite(n)||n<0)return false;value=n;}
  if(key==="debugMode"||key==="speedRunMode")value=Boolean(value);
  this.settings[key]=value;eventBus.emit("settings:update",{key,value});return true;
 }
 getTickSpeed(){const n=Number(this.settings.tickSpeed);return Number.isFinite(n)&&n>0?n:DEFAULT_SETTINGS.tickSpeed;}
 getAutoSaveInterval(){const n=Number(this.settings.autoSaveInterval);return Number.isFinite(n)&&n>=0?n:DEFAULT_SETTINGS.autoSaveInterval;}
 isDebugMode(){return Boolean(this.settings.debugMode);}
 isSpeedRunMode(){return Boolean(this.settings.speedRunMode);}
 reset(){this.settings={...DEFAULT_SETTINGS};eventBus.emit("settings:update");}
 toJSON(){return this.getAll();}
 load(data){this.settings={...DEFAULT_SETTINGS};if(data&&typeof data==="object")for(const key of Object.keys(DEFAULT_SETTINGS))if(Object.prototype.hasOwnProperty.call(data,key))this.set(key,data[key]);eventBus.emit("settings:update");return true;}
}
export default new SettingsManager();