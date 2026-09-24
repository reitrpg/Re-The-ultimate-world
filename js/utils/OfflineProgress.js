import WorldManager from "../world/Manager.js";
import ResourceManager from "../resource/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
import eventBus from "../core/eventBus.js";
class OfflineProgress {
 constructor(){this.maxOfflineTime=86400000;}
 saveTimestamp(){localStorage.setItem("world_creator_last_time",String(Date.now()));}
 getTimestamp(){const n=Number(localStorage.getItem("world_creator_last_time"));return Number.isFinite(n)&&n>0?n:0;}
 calculate(){
  const last=this.getTimestamp(); if(!last){this.saveTimestamp();return 0;}
  const seconds=Math.floor(Math.min(Math.max(0,Date.now()-last),this.maxOfflineTime)/1000);
  if(seconds<=0){this.saveTimestamp();return 0;}
  const world=WorldManager.getActive(); if(!world){this.saveTimestamp();return 0;}
  const globalMultiplier=ResearchManager.getTotalMultiplier()*UpgradeManager.getTotalMultiplier();
  const amounts={};
  ["plant","metal","magic"].forEach(id=>{
   const amount=world.getResourceProduction(id)*globalMultiplier*seconds;
   ResourceManager.produce(id,amount);
   amounts[id]=amount;
  });
  this.saveTimestamp();
  eventBus.emit("offline:update",{seconds,amounts});
  return seconds;
 }
}
export default new OfflineProgress();