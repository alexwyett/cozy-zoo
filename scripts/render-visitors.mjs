import { mkdir,writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import sharp from 'sharp';
import { sceneFixture } from './scene-fixture.mjs';
import { VISITOR_KEYS } from '../src/game/catalog.js';
import { animateVisitor } from '../src/game/visitors.js';
import { createPathTile } from '../src/game/paths.js';
import { render } from './rasterize.mjs';

const output=new URL('../art-previews/',import.meta.url);await mkdir(output,{recursive:true});
const world=await sceneFixture(),width=1600,height=1060,items=[];
for(let i=0;i<VISITOR_KEYS.length;i++){
  const root=new THREE.Group(),person=world.person(i);root.add(person);animateVisitor(person,.28,i%2===1);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.42,.45,.06,32),new THREE.MeshStandardMaterial({color:'#dce6c8'}));base.position.y=-.04;base.receiveShadow=true;root.add(base);
  const camera=new THREE.OrthographicCamera(-.72,.72,.9,-.56,.01,30);camera.position.set(2.4,1.8,4.6);camera.lookAt(0,.48,0);
  const buffer=await render(root,camera,220,265);
  const col=i%7,row=Math.floor(i/7);items.push({input:buffer,left:30+col*220,top:160+row*400});
}
const labels=VISITOR_KEYS.map((key,i)=>`<text x="${140+i%7*220}" y="${455+Math.floor(i/7)*400}" text-anchor="middle" font-size="14" fill="#647369">${key.replace('visitor-','')}</text>`).join('');
const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#f7f3e9"/><text x="52" y="64" font-family="sans-serif" font-size="34" font-weight="700" fill="#355d50">A little crowd for Pocket Zoo</text><text x="54" y="103" font-family="sans-serif" font-size="18" fill="#69766b">Kenney Mini Characters · 13 civilian visitors · original idle and walk animations</text><g font-family="sans-serif">${labels}</g><text x="54" y="1006" font-family="sans-serif" font-size="15" fill="#69766b">Actual game models · offline render · Kenney CC0 · kenney.nl/assets/mini-characters</text></svg>`);
await writeFile(new URL('kenney-visitors.png',output),await sharp(svg).composite(items).png().toBuffer());
const junctions=new THREE.Group();for(let i=0;i<16;i++){const tile=createPathTile(i);tile.position.set((i%4-1.5)*2.6,0,(Math.floor(i/4)-1.5)*2.6);junctions.add(tile);}
const camera=new THREE.OrthographicCamera(-8,8,6.3,-6.3,.1,60);camera.position.set(12,19,20);camera.lookAt(0,0,0);
const buffer=await render(junctions,camera,1200,950);
await writeFile(new URL('path-junctions.png',output),await sharp({create:{width:1200,height:950,channels:4,background:'#f7f3e9'}}).composite([{input:buffer}]).png().toBuffer());
console.log('Rendered art-previews/kenney-visitors.png and path-junctions.png.');
