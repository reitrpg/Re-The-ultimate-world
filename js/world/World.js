import BigNumber from "../number/BigNumber.js";
import ResourceManager from "../resource/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";

class World {
 constructor(seed=Date.now().toString()){this.seed=String(seed);this.name=`World-${this.seed.slice(-4)}`;this.rarity=this.generateRarity();this.level=1;this.exp=BigNumber.zero();this.rebirthMultiplier=BigNumber.one();this.baseProduction=BigNumber.one();this.uniqueEffect=1;this.resourceMultipliers={plant:1,metal:1,magic:1};}
 generateRarity(){const value=Number(this.seed.slice(-2))||0;return Math.max(1,Math.floor(value/10)+1);}
 getLevelMultiplier(){return(this.level*this.level)/100;}
 getRarityMultiplier(){return this.rarity;}
 getTotalMultiplier(){return BigNumber.one();}
 getResourceMultiplier(id){const value=Number(this.resourceMultipliers?.[id]);return Number.isFinite(value)?value:1;}
 getResourceProduction(id){return this.getResourceMultiplier(id);}
 gainExperience(amount){this.exp=this.exp.add(amount);}
 levelUp(){this.level+=1;}
 update(deltaTime){
  const globalMultiplier=ResearchManager.getTotalMultiplier()*UpgradeManager.getTotalMultiplier();
  ["plant","metal","magic"].forEach(id=>{
   const amount=this.getResourceProduction(id)*globalMultiplier*deltaTime;
   ResourceManager.produce(id,amount);
  });
 }
 toJSON(){return{seed:this.seed,name:this.name,rarity:this.rarity,level:this.level,exp:this.exp.toJSON(),rebirthMultiplier:this.rebirthMultiplier.toJSON(),baseProduction:this.baseProduction.toJSON(),uniqueEffect:this.uniqueEffect,resourceMultipliers:{...this.resourceMultipliers}};}
 load(data){if(!data||typeof data!=="object")return;this.seed=String(data.seed??Date.now());this.name=data.name||`World-${this.seed.slice(-4)}`;this.rarity=Number(data.rarity)||1;this.level=Math.max(1,Number(data.level)||1);this.exp=BigNumber.from(data.exp||0);this.rebirthMultiplier=BigNumber.from(data.rebirthMultiplier||1);this.baseProduction=BigNumber.from(data.baseProduction||1);this.uniqueEffect=Number.isFinite(Number(data.uniqueEffect))?Number(data.uniqueEffect):1;this.resourceMultipliers={plant:1,metal:1,magic:1,...(data.resourceMultipliers||{})};}
}
export default World;