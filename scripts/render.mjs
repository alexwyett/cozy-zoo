import { mkdir, writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import sharp from 'sharp';
import { ANIMALS, PALETTE as C, box } from '../src/models.js';
import { makeZoo, makeCamera } from '../src/scene.js';
import { render } from './rasterize.mjs';

const output=new URL('../art-previews/',import.meta.url); await mkdir(output,{recursive:true});
const font="font-family='Segoe UI,Arial,sans-serif'";
const svg=(w,h,body)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);
const text=(x,y,size,label,color='#304b43',weight=400)=>`<text x="${x}" y="${y}" ${font} font-size="${size}" font-weight="${weight}">${label}</text>`.replace('font-weight=',`fill="${color}" font-weight=`);
const rounded=(x,y,w,h,r,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${color}"/>`;
const img=(buffer,x,y,w,h)=>`<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/png;base64,${buffer.toString('base64')}"/>`;
const background=(w,h)=>rounded(0,0,w,h,0,'#f4f1e7');
const zoo=makeZoo();
console.log('Rendering the original zoo meshes with an offline shadow map...');
const hero=await render(zoo,makeCamera(1.40,17.8),1960,1400);
await writeFile(new URL('scene-transparent.png',output),await sharp(hero).resize(1600,1143).png().toBuffer());

let overview=background(1800,1480);
overview+=text(80,82,22,'POCKET ZOO   /   ART STUDY 01','#789080',600);
overview+=text(80,153,58,'A little zoo, built from the ground up.','#304b43',650);
overview+=text(82,199,24,'Original low-poly animals · warm natural colours · fixed isometric camera','#7e8d7d');
overview+=`<ellipse cx="900" cy="1012" rx="650" ry="227" fill="#d6dacb" opacity="0.45"/>`;
overview+=img(hero,0,204,1800,1286);
overview+=rounded(70,1377,1660,2,0,'#dce1d2');
overview+=text(80,1422,21,'01  SAVANNA','#607563',600)+text(650,1422,21,'02  WOODLAND PLAZA','#607563',600)+text(1270,1422,21,'03  PENGUIN COVE','#607563',600);
await writeFile(new URL('zoo-diorama.png',output),await sharp(svg(1800,1480,overview)).png().toBuffer());

const portraits=[];
for(const [kind,make] of Object.entries(ANIMALS)) {
  const root=new THREE.Group(),model=make(); root.add(model); model.rotation.y=-0.18;
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
  const span=Math.max(size.y*1.35,size.z*1.42,size.x*1.65);
  // A tiny studio platform grounds each animal without inventing a sprite.
  const r=Math.max(size.x,size.z)*0.78;
  const platform=box(root,0,-0.07,0,r*2,0.14,r*1.7,kind==='penguin'?'#d8e1d8':C.sand,0.12); platform.castShadow=false;
  const camera=new THREE.OrthographicCamera(-span*0.55,span*0.55,span/2,-span/2,0.1,50);
  camera.position.set(5,3.7,8); camera.lookAt(0,size.y*0.47,0);
  const image=await render(root,camera,760,820);
  portraits.push({kind,image});
  await writeFile(new URL(`${kind}.png`,output),await sharp(image).resize(570,615).png().toBuffer());
  console.log(`Rendered ${kind}`);
}
let lineup=background(1800,1000);
lineup+=text(65,75,20,'POCKET ZOO   /   CHARACTER STUDY','#789080',600);
lineup+=text(65,143,52,'Meet the first residents.','#304b43',650);
lineup+=text(65,186,23,'Simple silhouettes. Small details. Ready to become real game assets.','#7e8d7d');
portraits.forEach(({kind,image},i)=>{
  const x=60+i*570;
  lineup+=rounded(x,235,540,660,28,['#eee4ce','#e1e7df','#e0ebea'][i]);
  lineup+=img(image,x-5,242,550,593);
  lineup+=text(x+30,851,25,kind.toUpperCase(),'#304b43',650);
  lineup+=text(x+30,932,19,['Long neck · patch markings · tiny ossicones','Broad ears · curved trunk · pale tusks','Cream belly · orange feet · little flippers'][i],'#7e8d7d');
});
lineup+=text(65,980,16,'Individual portraits are framed separately; the scene shows the intended relative animal sizes.','#8b9586');
await writeFile(new URL('animal-lineup.png',output),await sharp(svg(1800,1000,lineup)).png().toBuffer());

let phone=background(1080,1920);
phone+=rounded(58,60,70,70,22,'#37624e');
phone+=text(74,107,28,'PZ','#fff5de',700)+text(151,108,40,'Pocket Zoo','#304b43',650);
phone+=text(60,191,19,'ART STUDY 01   /   PHONE COMPOSITION','#82917e',600);
phone+=text(60,265,60,'Your little world.','#304b43',650);
phone+=text(60,310,27,'Three habitats. A whole lot of character.','#82917e');
phone+=`<ellipse cx="540" cy="985" rx="445" ry="160" fill="#d6dacb" opacity="0.45"/>`;
const mobile=await render(zoo,makeCamera(1,22.8),1500,1500);
phone+=img(mobile,0,300,1080,1080);
phone+=text(60,1355,20,'THE FIRST RESIDENTS','#7d8d7b',600);
portraits.forEach(({kind,image},i)=>{
  const x=48+i*332;
  phone+=rounded(x,1393,320,350,26,['#eee4ce','#e1e7df','#e0ebea'][i]);
  phone+=img(image,x+10,1400,300,324);
  phone+=text(x+27,1710,22,kind[0].toUpperCase()+kind.slice(1),'#304b43',650);
});
phone+=rounded(60,1800,960,2,0,'#dce1d2');
phone+=text(60,1844,22,'Fixed camera · original 3D meshes','#71816f');
phone+=text(60,1881,20,'Visual prototype — gameplay and animation come next.','#8c9686');
await writeFile(new URL('mobile-portrait.png',output),await sharp(svg(1080,1920,phone)).png().toBuffer());
await writeFile(new URL('palette.json',output),JSON.stringify(C,null,2)+'\n');
console.log('Saved art-previews/zoo-diorama.png, animal-lineup.png and mobile-portrait.png.');
