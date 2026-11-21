import { mkdir,writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { sceneFixture } from './scene-fixture.mjs';
import { createGame,buy,tick } from '../src/game/simulation.js';
import { planStroke } from '../src/game/draw-build.js';
import { render } from './rasterize.mjs';

const world=await sceneFixture(1400,1000),s=createGame();s.coins=10000;buy(s,'station',10,7,1);
for(let i=0;i<110;i++)tick(s,.1);
const route=[[10,7],[11,7],[11,6],[11,5],[11,4],[10,4],[9,4],[9,5],[9,6],[9,7],[10,7]].map(([c,r])=>({c,r})),plan=planStroke(s,'rail-straight',route);
if(!plan.ok)throw new Error(plan.reason);
world.sync(s);world.update(s,0);world.showStroke(plan);world.sync(s);world.target.set(3,0,3);world.span=20;world.resize();
const buffer=await render(world.scene,world.camera,1400,1000);await mkdir(new URL('../art-previews/',import.meta.url),{recursive:true});
await writeFile(new URL('../art-previews/drawn-railway.png',import.meta.url),await sharp({create:{width:1400,height:1000,channels:4,background:'#dce8d5'}}).composite([{input:buffer}]).png().toBuffer());
console.log(`Rendered a ${plan.count}-piece railway preview costing $${plan.cost}, without a server.`);
