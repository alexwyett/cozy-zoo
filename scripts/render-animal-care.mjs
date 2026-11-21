import { readFile,writeFile,mkdir } from 'node:fs/promises';
import * as THREE from 'three';
import sharp from 'sharp';
import { sceneFixture } from './scene-fixture.mjs';
import { render } from './rasterize.mjs';
import { ensureResidents } from '../src/game/residents.js';
import { createGame,buy,tick } from '../src/game/simulation.js';
import { careQueueHTML,residentNamesHTML } from '../src/game/care-ui.js';

const out=new URL('../art-previews/',import.meta.url);await mkdir(out,{recursive:true});
const world=await sceneFixture(),cards=[];
for(let level=1;level<=3;level++){
  const b=ensureResidents({id:'b1',type:'penguin',c:2,r:6,rotation:0,level,remaining:0}),node=world.makeBuilding(b);
  node.root.position.set(0,0,0);for(const animal of node.animals)animal.mixer.update(.3);
  const camera=new THREE.OrthographicCamera(-3,3,3,-2,.1,40);camera.position.set(7,8,12);camera.lookAt(0,.4,0);camera.updateMatrixWorld();
  cards.push({input:await render(node.root,camera,480,480),left:level*500-490,top:65});
}
const backdrop=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="600"><rect width="1500" height="600" fill="#f7f3e9"/><g fill="#355d50" font-family="sans-serif" text-anchor="middle" font-size="24"><text x="250" y="42">Level 1 · 2 residents</text><text x="750" y="42">Level 2 · 3 residents</text><text x="1250" y="42">Level 3 · 4 residents</text></g><text x="750" y="572" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#69766b">Actual game models · individual sizes · independent animations</text></svg>');
await writeFile(new URL('animal-upgrades.png',out),await sharp(backdrop).composite(cards).png().toBuffer());
const state=createGame();state.coins=10000;buy(state,'lion',8,6);buy(state,'petting',0,6);for(let i=0;i<140;i++)tick(state,.1);
state.buildings.forEach((b,i)=>{b.food=18+i*8;b.clean=24+i*6;});
const manifest=JSON.parse(await readFile(new URL('../dist/assets/manifest.json',import.meta.url),'utf8'));globalThis.ZOO_THUMBNAILS=Object.fromEntries(Object.entries(manifest.thumbnails).map(([key,url])=>[key,'../dist/'+url.replace(/^\.\//,'')]));
const css=await readFile(new URL('../src/game/game.css',import.meta.url),'utf8');
await writeFile(new URL('animal-care-review.html',out),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cozy Zoo · Animal care layout review</title><style>${css}\nhtml,body{overflow:auto;height:auto;background:#e6eddb}main{max-width:440px;margin:24px auto;padding:22px;background:#fbf8ed;border-radius:24px}h1{font-size:25px}main>p{font-size:12px;color:#7a8c77}</style><main><h1>Animal care</h1><p>Layout review with sample needs. In the game, cards feed, clean or open their pen; name fields save per animal.</p>${careQueueHTML(state,state.buildings[0].id)}${residentNamesHTML(state.buildings[0])}</main></html>`);
console.log('Rendered animal-upgrades.png and a static animal-care-review.html using the actual care markup and CSS; no server.');
