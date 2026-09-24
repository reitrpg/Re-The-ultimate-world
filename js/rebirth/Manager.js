import BigNumber from "../number/BigNumber.js";
import eventBus from "../core/eventBus.js";
import WorldManager from "../world/Manager.js";

class RebirthManager{
 constructor(){this.count=0;this.multiplier=BigNumber.one();}
 getCount(){return this.count;}
 getMultiplier(){return this.multiplier;}
 calculateMultiplier(){const value=Math.max(1,(this.count+1)**2/100);this.multiplier=BigNumber.from(value);return this.multiplier;}
 applyMultiplier(){for(const world of WorldManager.getAll())world.rebirthMultiplier=BigNumber.from(this.multiplier);}
 rebirth(){this.count++;this.calculateMultiplier();this.applyMultiplier();eventBus.emit("rebirth:update");eventBus.emit("world:update");return true;}
 reset(){this.count=0;this.multiplier=BigNumber.one();for(const world of WorldManager.getAll())world.rebirthMultiplier=BigNumber.one();eventBus.emit("rebirth:update");}
 toJSON(){return{count:this.count,multiplier:this.multiplier.toJSON()};}
 load(data){this.count=Math.max(0,Number(data?.count)||0);this.multiplier=BigNumber.from(data?.multiplier||1);this.applyMultiplier();}
}
export default new RebirthManager();