import World from "./World.js";
import WorldGenerator from "./Generator.js";
import eventBus from "../core/eventBus.js";

class WorldManager{
 constructor(){this.worlds=[];this.activeWorldIndex=0;}
 create(seed){const world=WorldGenerator.generate(seed||Date.now().toString());this.worlds.push(world);this.activeWorldIndex=this.worlds.length-1;eventBus.emit("world:update");return world;}
 get(index){return this.worlds[index];}
 getAll(){return this.worlds;}
 getCount(){return this.worlds.length;}
 getActive(){return this.worlds[this.activeWorldIndex];}
 getActiveIndex(){return this.activeWorldIndex;}
 setActive(index){const n=Number(index);if(!Number.isInteger(n)||n<0||n>=this.worlds.length)return false;this.activeWorldIndex=n;eventBus.emit("world:update");return true;}
 update(deltaTime){const w=this.getActive();if(!w)return;w.update(deltaTime);eventBus.emit("world:update");}
 clear(){this.worlds=[];this.activeWorldIndex=0;eventBus.emit("world:update");}
 toJSON(){return{worlds:this.worlds.map(w=>w.toJSON()),activeWorldIndex:this.activeWorldIndex};}
 load(data){this.worlds=[];this.activeWorldIndex=0;if(!data||!Array.isArray(data.worlds))return false;for(const d of data.worlds){if(!d||typeof d!=="object")continue;const w=new World();w.load(d);this.worlds.push(w);}const n=Number(data.activeWorldIndex);if(Number.isInteger(n)&&n>=0&&n<this.worlds.length)this.activeWorldIndex=n;return this.worlds.length>0;}
}
export default new WorldManager();
