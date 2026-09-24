import World from "./World.js";

class WorldGenerator{
 hash(seed){let hash=0;const text=String(seed);for(let i=0;i<text.length;i++)hash=((hash<<5)-hash+text.charCodeAt(i))|0;return Math.abs(hash);}
 random(seed,index=0){let value=this.hash(`${seed}_${index}`);value=(value*9301+49297)%233280;return value/233280;}
 generateName(seed){const p=["Ancient","Crystal","Divine","Forgotten","Eternal","Sacred","Mystic","Infinite","Golden","Shadow"],s=["Forest","Kingdom","Ocean","World","Empire","Garden","Sanctuary","Abyss","Realm","Tree"];return `${p[Math.floor(this.random(seed,1)*p.length)]} ${s[Math.floor(this.random(seed,2)*s.length)]}`;}
 generateRarity(seed){const v=this.random(seed,3);if(v<.5)return 1;if(v<.75)return 2;if(v<.9)return 3;if(v<.98)return 4;return 5;}
 generateEffect(seed){return 1+this.random(seed,4);}
 generateProductionMultiplier(seed){return 1+this.random(seed,5)*2;}
 generate(seed){
  const worldSeed=String(seed),world=new World(worldSeed);
  world.name=this.generateName(worldSeed);
  world.rarity=this.generateRarity(worldSeed);
  world.uniqueEffect=this.generateEffect(worldSeed);
  world.baseProduction=world.baseProduction.multiply(this.generateProductionMultiplier(worldSeed));
  return world;
 }
}
export default new WorldGenerator();
