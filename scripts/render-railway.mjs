import { mkdir,writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import sharp from 'sharp';
import { sceneFixture } from './scene-fixture.mjs';
import { railwayFixture } from './railway-fixture.mjs';
import { render } from './rasterize.mjs';
import { tick } from '../src/game/simulation.js';

const output=new URL('../art-previews/',import.meta.url);await mkdir(new URL('shop/',output),{recursive:true});
const world=await sceneFixture(1400,1000),state=railwayFixture();
for(let i=0;i<430;i++)tick(state,.1);
world.target.set(8,.5,1);world.span=14;world.resize();world.sync(state);world.update(state,0);
const buffer=await render(world.scene,world.camera,1400,1000);
await writeFile(new URL('zoo-railway.png',output),await sharp({create:{width:1400,height:1000,channels:4,background:'#dce8d5'}}).composite([{input:buffer}]).png().toBuffer());
for(const type of ['station','rail-straight','rail-corner','rail-crossing']){
  const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#a0b18b',2));
  const sun=new THREE.DirectionalLight('#fff1d1',2.5);sun.position.set(-4,10,8);scene.add(sun);
  const node=world.makeBuilding({type,c:5.5,r:4.5,rotation:0,level:1,remaining:0});scene.add(node.root);
  if(type==='station'){const car=new THREE.Group();world.asset(car,'rail-model-front',0,.34,0,0,.6);scene.add(car);}
  const span=type==='rail-crossing'?3.7:1.7,camera=new THREE.OrthographicCamera(-span,span,span,-span,.1,50);camera.position.set(4,6,8);camera.lookAt(0,.5,0);camera.updateMatrixWorld();
  await writeFile(new URL(`shop/${type}.png`,output),await render(scene,camera,400,400));
}
console.log('Rendered zoo-railway.png and railway shop thumbnails from the actual scene graph, without a server.');
