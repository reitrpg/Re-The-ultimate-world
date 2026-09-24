import WorldManager from "../world/Manager.js";
import UnlockManager from "../world/UnlockManager.js";
import Formatter from "../utils/Formatter.js";
import eventBus from "../core/eventBus.js";

class WorldUI{
 constructor(){this.initialized=false;}
 initialize(){if(this.initialized)return;this.initialized=true;this.registerEvents();this.render();}
 registerEvents(){
  eventBus.on("world:update",()=>this.render());
  eventBus.on("world:unlock",()=>this.render());
  eventBus.on("world:create:success",()=>this.render());
  eventBus.on("world:create:failed",()=>this.render());
  eventBus.on("world:unlock:failed",failure=>{
   if(!failure)return;
   eventBus.emit("notification:show",{type:"warning",message:this.getUnlockFailureMessage(failure)});
  });
 }
 getUnlockFailureMessage(f){
  switch(f.code){
   case "INSUFFICIENT_EP":return "EPが不足しています。必要: "+Formatter.format(f.required)+" / 現在: "+Formatter.format(f.current);
   case "EP_CONSUME_FAILED":return "EPの消費に失敗しました。もう一度試してください。";
   default:return "世界の解放に失敗しました。";
  }
 }
 renderWorldList(){
  const c=document.getElementById("world-list");if(!c)return;
  c.innerHTML="";
  WorldManager.getAll().forEach((world,index)=>{
   const item=document.createElement("div"),button=document.createElement("button");
   button.type="button";button.textContent=world.name;button.dataset.action="world:select";button.dataset.worldIndex=String(index);
   if(index===WorldManager.getActiveIndex())button.setAttribute("aria-current","true");
   item.innerHTML="<p>Lv "+world.level+"</p><p>★ "+world.rarity+"</p>";
   item.appendChild(button);c.appendChild(item);
  });
 }
 renderActiveWorld(){
  const w=WorldManager.getActive(),name=document.getElementById("world-name"),level=document.getElementById("world-level"),rarity=document.getElementById("world-rarity");
  if(!w){if(name)name.textContent="-";if(level)level.textContent="-";if(rarity)rarity.textContent="-";return;}
  if(name)name.textContent=w.name;if(level)level.textContent=w.level;if(rarity)rarity.textContent=w.rarity;
 }
 renderUnlockCost(){const e=document.getElementById("unlock-cost");if(e)e.textContent=Formatter.format(UnlockManager.getUnlockCost());}
 render(){this.renderActiveWorld();this.renderWorldList();this.renderUnlockCost();}
}
export default new WorldUI();
