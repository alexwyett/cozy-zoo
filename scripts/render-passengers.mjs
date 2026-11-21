import { mkdir,writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import sharp from 'sharp';
import { sceneFixture } from './scene-fixture.mjs';
import { railwayFixture } from './railway-fixture.mjs';
import { tick } from '../src/game/simulation.js';
import { worldCell } from '../src/game/catalog.js';
import { render } from './rasterize.mjs';

const world=await sceneFixture(1200,900),s=railwayFixture(),station=s.buildings.find(b=>b.type==='station'),p=worldCell(10,8);
s.visitors=[];s.nextArrival=9999;
for(const [i,color] of [0,6,3,11].entries())s.visitors.push({id:'v'+(100+i),color,stage:'railQueue',admitted:true,cell:{c:10,r:8},x:p.x,z:p.z,route:[],target:station.id,wait:0,age:10,stay:999,visits:1,hunger:0,thirst:0,bladder:0,happiness:95,wallet:50});
tick(s,.1);world.sync(s);world.update(s,0);
const lead=world.railCars[0];world.target.copy(lead.position).add(new THREE.Vector3(-.35,.4,0));world.span=3.6;world.resize();
const image=await render(world.scene,world.camera,1200,900);
await mkdir(new URL('../art-previews/',import.meta.url),{recursive:true});
await writeFile(new URL('../art-previews/train-passengers.png',import.meta.url),await sharp({create:{width:1200,height:900,channels:4,background:'#dce8d5'}}).composite([{input:image}]).png().toBuffer());
console.log('Rendered seated train passengers from the actual boarding state, without a server.');
