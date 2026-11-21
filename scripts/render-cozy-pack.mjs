import { mkdir,writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import sharp from 'sharp';
import { listPack,loadPackFile,frameCamera,shortName } from './cozy-pack.mjs';
import { render } from './rasterize.mjs';

const output=new URL('../art-previews/cozy-zoo-free/',import.meta.url);await mkdir(new URL('individual/',output),{recursive:true});
const files=await listPack(),loaded=new Map(),images=new Map();
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const text=(x,y,size,s,fill='#304b43',weight=400)=>`<text x="${x}" y="${y}" font-family="Segoe UI,Arial,sans-serif" font-size="${size}" fill="${fill}" font-weight="${weight}">${esc(s)}</text>`;
const rect=(x,y,w,h,fill,r=18)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
const image=(b,x,y,w,h)=>`<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/png;base64,${b.toString('base64')}"/>`;
const svg=(w,h,s)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${rect(0,0,w,h,'#f4f1e7',0)}${s}</svg>`);
const filename=file=>file.replaceAll('\\','/').split('/').at(-1).replace('.glb','.png');
for(const file of files){
  const asset=await loadPackFile(file);loaded.set(file,asset);
  const root=new THREE.Group();root.add(asset.gltf.scene);
  const buffer=await render(root,frameCamera(root,1.22),610,500,{shadow:false});images.set(file,buffer);
  await writeFile(new URL(`individual/${filename(file)}`,output),buffer);
}
const animals=files.filter(f=>loaded.get(f).gltf.animations.length),props=files.filter(f=>!loaded.get(f).gltf.animations.length);
let sheet=text(58,65,19,'POCKET ZOO / PACK REVIEW 02','#7b8e7a',600)+text(58,122,43,'Cozy Zoo: the nine free animals','#304b43',650)+text(58,162,21,'Rendered from the downloaded GLBs using their supplied colours.','#7e8d7d');
animals.forEach((file,i)=>{
  const x=42+(i%3)*510,y=207+Math.floor(i/3)*475,asset=loaded.get(file);
  sheet+=rect(x,y,490,450,['#ede5d4','#e2e8e0','#e0e9e8'][Math.floor(i/3)]);
  sheet+=image(images.get(file),x+12,y+18,466,382);
  sheet+=text(x+25,y+406,24,shortName(file).replace('Animal ',''),'#304b43',600);
  sheet+=text(x+25,y+434,16,asset.gltf.animations.map(a=>a.name.split('_').slice(1).join('_')).join(' · '),'#6e8071');
});
sheet+=text(58,1680,18,'Sandial assets · Free sampler downloaded 18 November 2026 · 35 animation clips verified','#7e8d7d');
await writeFile(new URL('animals.png',output),await sharp(svg(1590,1720,sheet)).png().toBuffer());

let scenery=text(45,55,18,'POCKET ZOO / FREE SAMPLER SCENERY','#7b8e7a',600)+text(45,106,38,'38 building, habitat and scenery pieces','#304b43',650);
props.forEach((file,i)=>{
  const x=26+(i%6)*292,y=143+Math.floor(i/6)*243;
  scenery+=rect(x,y,279,230,'#e7e9de',12)+image(images.get(file),x+5,y+5,269,185);
  const name=shortName(file).replace(/^(Ground|Fence|Wall|Roof|Shelter|Visitor|Habitat|Plant|Pool|Amenity|Sign|Keeper|Terrain) /,'');
  scenery+=text(x+12,y+211,14,name,'#425c4d',600);
});
scenery+=text(45,1887,18,'Free files only. Each tile is framed independently; object sizes are not directly comparable.','#7e8d7d');
await writeFile(new URL('scenery.png',output),await sharp(svg(1800,1920,scenery)).png().toBuffer());
console.log('Saved the animal and scenery contact sheets.');

// A fresh layout assembled entirely from the supplied GLBs; the bundled FBX
// diorama is retained unmodified in the vendor directory.
const stage=new THREE.Group();stage.name='Free_sampler_GLB_layout';
function place(fragment,x,y,z,angle=0,scale=1){
  const file=files.find(f=>f.includes(fragment));if(!file)throw new Error(`Missing asset ${fragment}`);
  const node=clone(loaded.get(file).gltf.scene);node.position.set(x,y,z);node.rotation.y=angle;node.scale.setScalar(scale);stage.add(node);return node;
}
for(const x of [-6,-2,2,6])for(const z of [-6,-2,2,6]){
  const id=z<0?(x<0?'Ground_Savanna':'Ground_Grass'):(x<0?'Ground_PathStraight':(z===6?'Pool_Centre':'Ground_Grass'));place(id,x,0,z,Math.PI/2);
}
for(const x of [-6,-2,2,6])place('Fence_WoodRailStraight',x,0.30,-8);
for(const z of [-6,-2]){place('Fence_WoodRailStraight',-8,0.3,z,Math.PI/2);place('Fence_WoodRailStraight',0,0.3,z,Math.PI/2);place('Fence_WoodRailStraight',8,0.3,z,Math.PI/2);}
for(const x of [-6,-2,2,6])place('Fence_WoodRailStraight',x,0.3,0);
place('Animal_Giraffe',-5,0.35,-4,0.0);place('Animal_Elephant',-2.2,0.35,-3.6,-0.45);
place('Animal_Lion',3.5,0.35,-4.0,-0.25);place('Habitat_HayRack',-6.2,0.35,-1.2);
place('Plant_Acacia',-6.0,0.3,-6.2,0,0.70);place('Plant_PalmTree',6.3,0.3,-6.3,0,0.80);
place('Animal_EmperorPenguin',2.0,0.4,1.8,0.2);place('Animal_HarborSeal',4.9,0.4,1.8,-0.5);
place('Terrain_RockPile',6.7,0.35,5.9,0,0.7);
place('Visitor_TicketBooth',-5.7,0.3,4.6,0,0.75);
place('Amenity_Bench',-1.65,0.3,4.3,-Math.PI/2);place('Amenity_Bin',-1.7,0.3,6.6,0,0.7);
place('Sign_DirectionSignpost',-0.7,0.3,1.7,0,0.8);
for(const [x,z] of [[7.1,0.5],[-7.0,0.6],[-7.0,7],[7.0,7]])place('Plant_BushRound',x,0.3,z,0,0.8);
let overview=text(60,65,19,'POCKET ZOO / FREE ASSET SCENE TEST','#7b8e7a',600)+text(60,126,43,'A small park using the free sampler','#304b43',650)+text(60,170,21,'Fresh layout from Sandial GLBs · supplied materials · simplified offline lighting','#7e8d7d');
const sceneImage=await render(stage,frameCamera(stage,1.4),1960,1400);
overview+=image(sceneImage,0,187,1800,1286)+text(60,1440,18,'This is our comparison layout, not the creator’s bundled FBX starter diorama.','#7e8d7d');
await writeFile(new URL('scene.png',output),await sharp(svg(1800,1480,overview)).png().toBuffer());
console.log('Saved the free-pack scene comparison.');

const frames=[],count=18,entries=animals.map(file=>{
  const {gltf}=loaded.get(file),root=new THREE.Group();root.add(gltf.scene);
  const clip=gltf.animations.find(a=>/_(Walk|Waddle|Crawl|Scoot)$/.test(a.name))??gltf.animations[0];
  const mixer=new THREE.AnimationMixer(gltf.scene);mixer.clipAction(clip).play();
  const camera=frameCamera(root,1.16); // Same camera throughout each tile's loop.
  return {file,root,clip,mixer,camera};
});
for(let frame=0;frame<count;frame++){
  let board=text(24,35,18,'COZY ZOO / FREE ANIMATION SAMPLES','#304b43',650);
  for(const [i,entry] of entries.entries()){
    const x=12+(i%3)*304,y=61+Math.floor(i/3)*294;
    entry.mixer.setTime(entry.clip.duration*frame/count);
    const buffer=await render(entry.root,entry.camera,280,238,{shadow:false});
    board+=rect(x,y,292,283,'#e5e9df',15)+image(buffer,x+6,y+2,280,238);
    board+=text(x+14,y+259,15,entry.clip.name.replaceAll('_',' / '),'#425c4d',600);
  }
  board+=text(24,975,15,'Supplied animations · one complete loop per tile · timing normalised for comparison','#7e8d7d');
  frames.push(await sharp(svg(936,1000,board)).png().toBuffer());
  if(frame%6===0)console.log(`Animation frame ${frame+1}/${count}`);
}
await writeFile(new URL('animations.gif',output),await sharp(frames,{join:{animated:true}}).gif({delay:Array(count).fill(100),loop:0,effort:5}).toBuffer());
await writeFile(new URL('animation-still.png',output),frames[0]);
console.log('Saved animations.gif from the supplied skeletal animation clips.');
