/**
 * World Creator
 * Tab UI
 */
import eventBus from "../core/eventBus.js";

class TabUI {
 constructor(){this.initialized=false;this.activeTab=null;this.tabs=[];this.panels=[];this.lastActivationTarget=null;this.lastActivationTime=0;}
 initialize(){
  if(this.initialized)return;
  this.collectElements();
  if(this.tabs.length===0){this.initialized=true;return;}
  this.initialized=true;
  ["pointerup","touchend","click"].forEach(type=>document.addEventListener(type,e=>this.handleInput(e),true));
  const initial=this.getInitialTab();if(initial)this.setActive(initial,false);
 }
 collectElements(){
  this.tabs=Array.from(document.querySelectorAll("[data-tab], .tab-button"));
  this.panels=Array.from(document.querySelectorAll("[data-tab-panel], .tab-panel, .tab-content"));
 }
 resolveTab(event){
  const path=typeof event.composedPath==="function"?event.composedPath():[];
  for(const node of path){if(node&&typeof node.closest==="function"){const t=node.closest("[data-tab], .tab-button");if(t)return t;}}
  const t=event.target;return t&&typeof t.closest==="function"?t.closest("[data-tab], .tab-button"):null;
 }
 handleInput(event){
  const tab=this.resolveTab(event);if(!tab)return;
  const now=Date.now();
  if(this.lastActivationTarget===tab&&now-this.lastActivationTime<500)return;
  this.lastActivationTarget=tab;this.lastActivationTime=now;
  const id=this.getTabId(tab);if(!id)return;
  event.preventDefault();this.setActive(id);
 }
 getTabId(tab){
  if(!tab)return null;
  if(tab.dataset.tab)return tab.dataset.tab;
  if(tab.dataset.target)return tab.dataset.target.replace(/^#/,"");
  const href=tab.getAttribute("href");
  return href&&href.startsWith("#")?href.slice(1).replace(/-tab$/,""):null;
 }
 getPanelId(panel){
  if(!panel)return null;
  if(panel.dataset.tabPanel)return panel.dataset.tabPanel;
  if(panel.dataset.tabContent)return panel.dataset.tabContent;
  return panel.id?panel.id.replace(/-tab$/,""):null;
 }
 getInitialTab(){
  const active=this.tabs.find(t=>t.classList.contains("active")||t.getAttribute("aria-selected")==="true");
  return active?this.getTabId(active):this.getTabId(this.tabs[0]);
 }
 setActive(tabId,emit=true){
  const tab=this.tabs.find(t=>this.getTabId(t)===tabId);
  const panel=this.panels.find(p=>this.getPanelId(p)===tabId);
  if(!tab||!panel)return false;
  this.tabs.forEach(t=>{
   const active=this.getTabId(t)===tabId;
   t.classList.toggle("active",active);
   if(t.hasAttribute("aria-selected"))t.setAttribute("aria-selected",String(active));
   if(t.hasAttribute("aria-expanded"))t.setAttribute("aria-expanded",String(active));
   t.disabled=false;
  });
  this.panels.forEach(p=>{
   const active=this.getPanelId(p)===tabId;
   p.hidden=!active;p.classList.toggle("active",active);p.setAttribute("aria-hidden",String(!active));
  });
  this.activeTab=tabId;
  if(emit){eventBus.emit("tab:change",tabId);eventBus.emit("tab:update",tabId);}
  return true;
 }
 open(id){return this.setActive(id);}
 getActiveTab(){return this.activeTab;}
 getActive(){return this.activeTab;}
 getTabs(){return[...this.tabs];}
 getPanels(){return[...this.panels];}
}
export default new TabUI();
