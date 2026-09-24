import BigNumber from "../number/BigNumber.js";
import EPManager from "../ep/Manager.js";
import WorldManager from "./Manager.js";
import eventBus from "../core/eventBus.js";
class UnlockManager{
 constructor(){this.unlockedWorlds=1;this.baseCost=BigNumber.from(10000);}
 getUnlockCost(){return BigNumber.from(10000*Math.pow(10,Math.max(0,this.unlockedWorlds-1)));}
 canUnlock(){return EPManager.has(this.getUnlockCost());}
 unlock(seed){if(!this.canUnlock())return false;const cost=this.getUnlockCost();if(!EPManager.consume(cost))return false;const w=WorldManager.create(seed||Date.now().toString());this.unlockedWorlds++;eventBus.emit("world:unlock",w);return true;}
 getUnlockedWorldCount(){return this.unlockedWorlds;}
 toJSON(){return{unlockedWorlds:this.unlockedWorlds};}
 load(data){const n=data&&Number(data.unlockedWorlds);this.unlockedWorlds=Number.isInteger(n)&&n>=1?n:Math.max(1,WorldManager.getCount());}
}
export default new UnlockManager();