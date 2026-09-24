import eventBus from "./eventBus.js";
import UnlockManager from "../world/UnlockManager.js";
import WorldManager from "../world/Manager.js";

class InputActionController {
 constructor(){this.initialized=false;}
 initialize(){
  if(this.initialized)return;
  this.initialized=true;
  eventBus.on("world:create:request",payload=>this.handleWorldCreate(payload));
  eventBus.on("world:select",payload=>this.handleWorldSelect(payload));
 }
 handleWorldCreate(payload={}){
  try{
   const seed=payload.seed??Date.now().toString();
   const cost=UnlockManager.getUnlockCost();
   const created=UnlockManager.unlock(seed);
   eventBus.emit(created?"world:create:success":"world:create:failed",{seed,cost});
  }catch(error){
   eventBus.emit("world:create:failed",{code:"WORLD_CREATE_ERROR",error});
   throw error;
  }
 }
 handleWorldSelect(payload={}){
  const index=Number(payload.target?.dataset?.worldIndex);
  if(!WorldManager.setActive(index)){eventBus.emit("world:select:failed",{index});return;}
  eventBus.emit("world:select:success",{index});
 }
}
export default new InputActionController();
