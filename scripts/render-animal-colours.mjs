import { writeFile,mkdir } from 'node:fs/promises';
import * as THREE from 'three';
import sharp from 'sharp';
import { sceneFixture } from './scene-fixture.mjs';
import { render } from './rasterize.mjs';
import { ensureResidents } from '../src/game/residents.js';

const out=new URL('../art-previews/',import.meta.url);await mkdir(out,{recursive:true});
const world=await sceneFixture(),cards=[],labels=[];
for(const [row,type] of ['penguin','giraffe','petting'].entries()){
  for(const [col,color] of [null,'#96bd9a','#8db7d4','#b39dcd'].entries()){
    const b=ensureResidents({id:'colour-review',type,c:0,r:0,rotation:0,level:1,remaining:0});
    for(const animal of b.animals)animal.color=color;
    const node=world.makeBuilding(b);node.root.position.set(0,0,0);
    for(const animal of node.animals)animal.mixer.update(.3);
    const camera=new THREE.OrthographicCamera(-3,3,3,-2,.1,40);camera.position.set(7,8,12);camera.lookAt(0,.4,0);camera.updateMatrixWorld();
    cards.push({input:await render(node.root,camera,350,350),left:col*350,top:row*355+40});
    labels.push(`<text x="${col*350+175}" y="${row*355+45}">${['Natural','Sage','Sky','Lilac'][col]}</text>`);
  }
}
const backdrop=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1120"><rect width="1400" height="1120" fill="#f7f3e9"/><g fill="#355d50" font-family="sans-serif" text-anchor="middle" font-size="21">${labels.join('')}</g><text x="700" y="1100" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#69766b">Cozy Zoo coat colours - actual models, original markings and independent materials</text></svg>`);
await writeFile(new URL('animal-colours.png',out),await sharp(backdrop).composite(cards).png().toBuffer());
console.log('Rendered art-previews/animal-colours.png without a browser or server.');
