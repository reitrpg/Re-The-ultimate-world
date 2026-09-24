import eventBus from "./eventBus.js";

class InputManager {
 constructor(){this.initialized=false;this.lastDispatchTime=0;this.lastDispatchTarget=null;}
 initialize(){
  if(this.initialized)return;
  this.initialized=true;
  const handle=e=>this.dispatch(e);
  ["pointerup","touchend","mouseup","click"].forEach(type=>document.addEventListener(type,handle,true));
  document.addEventListener("keyup",e=>{if(e.key==="Enter"||e.key===" ")this.dispatch(e);},true);
 }
 resolveTarget(event){
  const path=typeof event.composedPath==="function"?event.composedPath():[];
  for(const node of path){if(node&&typeof node.closest==="function"){const t=node.closest("[data-action], button, [role='button']");if(t)return t;}}
  const t=event.target;
  return t&&typeof t.closest==="function"?t.closest("[data-action], button, [role='button']"):null;
 }
 dispatch(event){
  const target=this.resolveTarget(event);
  if(!target||target.disabled)return false;
  const action=target.dataset?.action||null;
  if(!action){eventBus.emit("input:pressed",{action:null,target,originalEvent:event});return true;}
  const now=Date.now();
  if(this.lastDispatchTarget===target&&now-this.lastDispatchTime<500)return false;
  this.lastDispatchTarget=target;this.lastDispatchTime=now;
  const payload={target,originalEvent:event};
  eventBus.emit(action,payload);
  eventBus.emit("input:pressed",{action,target,originalEvent:event});
  return true;
 }
}
export default new InputManager();
