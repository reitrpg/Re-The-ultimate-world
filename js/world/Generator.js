import World from "./World.js";

const FEATURE_DEFINITIONS = {
 plant: {
  name: "植物の大地",
  values: [0.75, 1, 1.4]
 },
 metal: {
  name: "豊かな鉱脈",
  values: [0.75, 1, 1.4]
 },
 magic: {
  name: "魔力の源泉",
  values: [0.75, 1, 1.4]
 }
};

class WorldGenerator {
 hash(seed) {
  let hash = 0;
  const text = String(seed);
  for (let i = 0; i < text.length; i++) {
   hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
 }

 random(seed, index = 0) {
  let value = this.hash(`${seed}_${index}`);
  value = (value * 9301 + 49297) % 233280;
  return value / 233280;
 }

 generateName(seed) {
  const prefixes = ["Ancient","Crystal","Divine","Forgotten","Eternal","Sacred","Mystic","Infinite","Golden","Shadow"];
  const suffixes = ["Forest","Kingdom","Ocean","World","Empire","Garden","Sanctuary","Abyss","Realm","Tree"];
  return `${prefixes[Math.floor(this.random(seed, 1) * prefixes.length)]} ${suffixes[Math.floor(this.random(seed, 2) * suffixes.length)]}`;
 }

 generateRarity(seed) {
  const value = this.random(seed, 3);
  if (value < 0.5) return 1;
  if (value < 0.75) return 2;
  if (value < 0.9) return 3;
  if (value < 0.98) return 4;
  return 5;
 }

 generateEffect(seed) {
  return 1 + this.random(seed, 4);
 }

 generateResourceFeatures(seed) {
  const ids = ["plant", "metal", "magic"];
  const multipliers = [1.4, 1, 0.75];
  const offset = Math.floor(this.random(seed, 5) * ids.length);
  const order = ids.map((_, index) => ids[(index + offset) % ids.length]);

  const values = {};
  const names = {};

  order.forEach((id, index) => {
   values[id] = multipliers[index];
   names[id] = FEATURE_DEFINITIONS[id].name;
  });

  return { multipliers: values, names };
 }

 generate(seed) {
  const worldSeed = String(seed);
  const world = new World(worldSeed);

  world.name = this.generateName(worldSeed);
  world.rarity = this.generateRarity(worldSeed);
  world.uniqueEffect = this.generateEffect(worldSeed);

  const features = this.generateResourceFeatures(worldSeed);
  world.resourceMultipliers = features.multipliers;
  world.resourceFeatures = features.names;

  return world;
 }
}

export default new WorldGenerator();
