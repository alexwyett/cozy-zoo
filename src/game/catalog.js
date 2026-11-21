import { WORLD_BOUNDS } from './land.js';
export const TILE = 2, COLS = 12, ROWS = 10, ADMISSION = 12;
export const GATE = { c: 5, r: 9 };
export const GROUND_WIDTH=90;
export const ROAD={width:GROUND_WIDTH,z:12.4,spawnX:-GROUND_WIDTH/2-3,exitX:GROUND_WIDTH/2+3,speed:12};
export const normalizeRotation=turns=>Number.isInteger(turns)?((turns%4)+4)%4:0;
export const ASSET_ROOT = 'assets/vendor/sandial-cozy-zoo-free/GLB/';
export const VISITOR_KEYS=[...'abcdef'].map(c=>'visitor-female-'+c).concat([...'abcdefg'].map(c=>'visitor-male-'+c));
export const assetFile=key=>key.startsWith('rail-model-')?'assets/railway/kenney/'+ASSETS[key]:key.startsWith('visitor-')?'assets/characters/kenney/'+ASSETS[key]:key.startsWith('farm-')?'assets/animals/quaternius/'+ASSETS[key]:ASSET_ROOT+ASSETS[key];
export const ASSETS = {
  'rail-model-straight':'coaster-wood-straight.glb','rail-model-corner':'coaster-wood-corner-small.glb',
  'rail-model-front':'coaster-train-front.glb','rail-model-car':'coaster-train.glb','rail-model-platform':'station.glb','rail-model-entrance':'ride-entrance.glb',
  'farm-cow':'cow.glb','farm-sheep':'sheep.glb','farm-pig':'pig.glb',
  ...Object.fromEntries(VISITOR_KEYS.map(key=>[key,key.replace('visitor-','')+'.glb'])),
  grass:'01_Ground_Paths/ZOO_Ground_Grass_4x4.glb', sand:'01_Ground_Paths/ZOO_Ground_Savanna_4x4.glb',
  path:'01_Ground_Paths/ZOO_Ground_PathStraight_4x4.glb', corner:'01_Ground_Paths/ZOO_Ground_PathCorner_4x4.glb',
  fence:'02_Fences_Barriers/ZOO_Fence_WoodRailStraight_4x1.glb', gateFence:'02_Fences_Barriers/ZOO_Fence_WoodRailGate_4x1.glb',
  entrance:'05_Visitor_Buildings/ZOO_Visitor_EntranceGate_10x2.glb', booth:'05_Visitor_Buildings/ZOO_Visitor_TicketBooth_4x4.glb',
  tree:'07_Plants_Trees/ZOO_Plant_Acacia_5x5.glb', palm:'07_Plants_Trees/ZOO_Plant_PalmTree_4x5.glb',
  bush:'07_Plants_Trees/ZOO_Plant_BushRound_2x2.glb', rock:'19_Terrain_Rockwork/ZOO_Terrain_RockPile_2x2.glb',
  pool:'08_Water_Pools/ZOO_Pool_Centre_4x4.glb', hay:'06_Habitat_Enrichment/ZOO_Habitat_HayRack_2x1.glb',
  bench:'13_Visitor_Amenities/ZOO_Amenity_Bench_2x1.glb', fountain:'13_Visitor_Amenities/ZOO_Amenity_DrinkingFountain_1x1.glb',
  bin:'13_Visitor_Amenities/ZOO_Amenity_Bin_1x1.glb', hut:'04_Animal_Houses_Shelters/ZOO_Shelter_KeeperHut_4x4.glb',
  shelter:'04_Animal_Houses_Shelters/ZOO_Shelter_FeedingShelter_4x4.glb',
  penguin:'11_Animals_Polar_Aquatic/ZOO_Animal_EmperorPenguin_1x1.glb', seal:'11_Animals_Polar_Aquatic/ZOO_Animal_HarborSeal_1x2.glb',
  lion:'09_Animals_Savanna/ZOO_Animal_Lion_1x3.glb', giraffe:'09_Animals_Savanna/ZOO_Animal_Giraffe_1x3.glb',
  elephant:'09_Animals_Savanna/ZOO_Animal_Elephant_3x3.glb', panda:'10_Animals_Jungle_Forest/ZOO_Animal_GiantPanda_1x2.glb',
  gorilla:'10_Animals_Jungle_Forest/ZOO_Animal_Gorilla_1x2.glb', crocodile:'12_Animals_Birds_Reptiles_Small/ZOO_Animal_Crocodile_1x4.glb',
  flamingo:'12_Animals_Birds_Reptiles_Small/ZOO_Animal_Flamingo_1x1.glb',
};
const pen=(name,price,animal,icon,description,buildTime=12)=>({name,price,animal,icon,description,category:'habitats',kind:'pen',w:2,h:2,buildTime,feedCost:Math.round(20+price/100),appeal:18+price/90});
export const CATALOG = {
  station:{name:'Zoo railway station',price:350,icon:'train',category:'railway',kind:'station',railShape:'straight',w:1,h:1,buildTime:8,description:'A ready-made platform, ride entrance and little train. Complete a loop to carry guests for $8.'},
  'rail-straight':{name:'Straight track',price:25,icon:'track',category:'railway',kind:'rail',railShape:'straight',w:1,h:1,buildTime:0,description:'Join matching rail ends. Rotate to run north–south or east–west.'},
  'rail-corner':{name:'Curved track',price:30,icon:'track',category:'railway',kind:'rail',railShape:'corner',w:1,h:1,buildTime:0,description:'A smooth quarter turn. Rotate to line up both ends.'},
  'rail-crossing':{name:'Railway footbridge',price:45,icon:'bridge',category:'railway',kind:'rail',railShape:'straight',crossing:true,w:1,h:1,buildTime:0,description:'Straight rails below a wooden path bridge. Includes two ramp paths; needs three clear tiles across the track.'},
  petting:pen('Mini petting farm',650,'farm-sheep','paw','Meet a cow, a woolly sheep and a little pig. Includes a shelter, hay and fencing.',12),
  penguin:pen('Penguin cove',500,'penguin','penguin','A little pool and two very happy waddlers.',8),
  lion:pen('Lion savanna',800,'lion','paw','A sunny home for the king of the zoo.'),
  giraffe:pen('Giraffe grove',1100,'giraffe','leaf','Tall trees, fresh hay and a gentle giant.',14),
  elephant:pen('Elephant sanctuary',1300,'elephant','paw','A spacious sandy pen with an elephant.',16),
  panda:pen('Panda garden',1000,'panda','leaf','A leafy retreat for a bamboo-loving bear.',14),
  gorilla:pen('Gorilla garden',1100,'gorilla','paw','A shady home for a curious gorilla.',14),
  seal:pen('Seal lagoon',850,'seal','drop','A splash of water and a friendly seal.'),
  crocodile:pen('Crocodile creek',750,'crocodile','drop','A warm waterhole for a toothy resident.'),
  flamingo:pen('Flamingo pond',600,'flamingo','leaf','A colourful pond with two flamingos.',10),
  food:{name:'Snack shack',price:250,icon:'food',category:'facilities',kind:'food',w:1,h:1,buildTime:7,revenue:8,description:'Serves hungry guests. Earns $8 per snack.'},
  drink:{name:'Lemonade stand',price:180,icon:'drink',category:'facilities',kind:'drink',w:1,h:1,buildTime:6,revenue:6,description:'Keeps guests refreshed. Earns $6 per drink.'},
  toilet:{name:'Guest toilets',price:220,icon:'toilet',category:'facilities',kind:'toilet',w:1,h:1,buildTime:8,revenue:0,description:'A comfortable pit stop. Free for visitors.'},
  gift:{name:'Little gift shop',price:300,icon:'gift',category:'facilities',kind:'gift',w:1,h:1,buildTime:9,revenue:12,description:'A souvenir to take home. Earns $12 per gift.'},
  path:{name:'Garden path',price:10,icon:'path',category:'landscape',kind:'path',w:1,h:1,buildTime:0,description:'Connect new habitats and facilities to the gate.'},
  bench:{name:'Park bench',price:40,icon:'bench',category:'landscape',kind:'bench',w:1,h:1,buildTime:2,description:'A place for guests to catch their breath.'},
  tree:{name:'Acacia tree',price:35,icon:'tree',category:'landscape',kind:'tree',w:1,h:1,buildTime:2,description:'A little shade makes the zoo feel like home.'},
};
export const worldCell=(c,r)=>({x:(c-COLS/2+0.5)*TILE,z:(r-ROWS/2+0.5)*TILE,c,r});
export const gridCell=(x,z)=>({c:Math.floor(x/TILE+COLS/2),r:Math.floor(z/TILE+ROWS/2)});
export const cellKey=(c,r)=>`${c},${r}`;
export const neighbors=(c,r)=>[{c:c-1,r},{c:c+1,r},{c,r:r-1},{c,r:r+1}].filter(p=>p.c>=WORLD_BOUNDS.minC&&p.c<WORLD_BOUNDS.maxC&&p.r>=WORLD_BOUNDS.minR&&p.r<WORLD_BOUNDS.maxR);
