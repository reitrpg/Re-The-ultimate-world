import EPManager from "../ep/Manager.js";
import Formatter from "../utils/Formatter.js";
import eventBus from "../core/eventBus.js";
class EPUI {
 constructor(){this.initialized=false;}
 initialize(){if(this.initialized)return;this.initialized=true;eventBus.on("ep:update",()=>this.render());this.render();}
 render(){const e=document.getElementById("ep-value");if(e)e.textContent=Formatter.format(EPManager.get());}
}
export default new EPUI();