import eventBus from "../core/eventBus.js";
import ResourceManager from "../resource/Manager.js";
import EPManager from "../ep/Manager.js";
import WorldManager from "../world/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
class DebugManager{
 addResource(id,amount){const ok=ResourceManager.add(id,amount);eventBus.emit("debug:update");return ok;}
 addEP(amount){EPManager.add(amount);eventBus.emit("debug:update");return true;}
 setWorldLevel(level){const w=WorldManager.getActive(),n=Number(level);if(!w||!Number.isFinite(n)||n<1)return false;w.level=Math.floor(n);eventBus.emit("world:update");return true;}
 setResearchLevel(id,level){const r=ResearchManager.get(id),n=Number(level);if(!r||!Number.isFinite(n)||n<0)return false;r.level=Math.floor(n);eventBus.emit("research:update");return true;}
 setUpgradeLevel(id,level){const u=UpgradeManager.get(id),n=Number(level);if(!u||!Number.isFinite(n)||n<0)return false;u.level=Math.floor(n);eventBus.emit("upgrade:update");return true;}
 resetAll(){EPManager.reset();ResourceManager.clear();ResearchManager.reset();UpgradeManager.reset();WorldManager.clear();WorldManager.create(Date.now().toString());eventBus.emit("debug:reset");}
}
export default new DebugManager();