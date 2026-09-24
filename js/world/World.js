import BigNumber from "../number/BigNumber.js";
import ResourceManager from "../resource/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";

class World {
 constructor(seed=Date.now().toString()){this.seed=String(seed);this.name=`World-${this.seed.slice(-4)}`;this.rarity=this.generateRarity();this.level=1;this.exp=BigNumber.zero();this.rebirthMultiplier=BigNumber.one();this.baseProduction=BigNumber.one();this.uniqueEffect=1;this.resourceMultipliers={plant:1,metal:1,magic:1};this.rebirthCount=0;}
 generateRarity(){const value=Number(this.seed.slice(-2))||0;return Math.max(1,Math.floor(value/10)+1);}
 getLevelMultiplier(){return(this.level*this.level)/100;}
 getRarityMultiplier(){return this.rarity;}
 getTotalMultiplier(){return BigNumber.one();}
 getResourceMultiplier(id){const value=Number(this.resourceMultipliers?.[id]);return Number.isFinite(value)?value:1;}
 getResourceProduction(id){return this.getResourceMultiplier(id)*this.rebirthMultiplier.toNumber();}
 gainExperience(amount){this.exp=this.exp.add(amount);}
 getRebirthMultiplier(){return BigNumber.one().add(this.exp.divide(100));}
 canRebirth(){return this.getRebirthMultiplier().greaterOrEqual(2.5);}
 performRebirth(){if(!this.canRebirth())return false;const sacrifice=this.getRebirthMultiplier();this.rebirthMultiplier=this.rebirthMultiplier.multiply(sacrifice);this.rebirthCount+=1;this.exp=BigNumber.zero();this.level=1;return true;}
 levelUp(){this.level+=1;}
 update(deltaTime){
  const globalMultiplier=ResearchManager.getTotalMultiplier()*UpgradeManager.getTotalMultiplier();
  let experienceGain=BigNumber.zero();
  ["plant","metal","magic"].forEach(id=>{
   const amount=this.getResourceProduction(id)*globalMultiplier*deltaTime;
   if(ResourceManager.produce(id,amount)) experienceGain=experienceGain.add(amount);
  });
  this.gainExperience(experienceGain);
 }
 toJSON(){return{seed:this.seed,name:this.name,rarity:this.rarity,level:this.level,exp:this.exp.toJSON(),rebirthMultiplier:this.rebirthMultiplier.toJSON(),rebirthCount:this.rebirthCount,baseProduction:this.baseProduction.toJSON(),uniqueEffect:this.uniqueEffect,resourceMultipliers:{...this.resourceMultipliers}};}
 load(data){if(!data||typeof data!=="object")return;this.seed=String(data.seed??Date.now());this.name=data.name||`World-${this.seed.slice(-4)}`;this.rarity=Number(data.rarity)||1;this.level=Math.max(1,Number(data.level)||1);this.exp=BigNumber.from(data.exp||0);this.rebirthMultiplier=BigNumber.from(data.rebirthMultiplier||1);this.rebirthCount=Math.max(0,Number(data.rebirthCount)||0);this.baseProduction=BigNumber.from(data.baseProduction||1);this.uniqueEffect=Number.isFinite(Number(data.uniqueEffect))?Number(data.uniqueEffect):1;this.resourceMultipliers={plant:1,metal:1,magic:1,...(data.resourceMultipliers||{})};}
}
export default World;