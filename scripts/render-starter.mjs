import { mkdir,writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { sceneFixture } from './scene-fixture.mjs';
import { createGame,tick } from '../src/game/simulation.js';
import { render } from './rasterize.mjs';

const output=new URL('../art-previews/',import.meta.url);await mkdir(output,{recursive:true});
for(const [name,width,height] of [['starter-desktop',1600,1000],['starter-phone',780,1400]]){
  const world=await sceneFixture(width,height),state=createGame();
  for(let i=0;i<90;i++)tick(state,0.1);world.sync(state);world.update(state,0);
  const buffer=await render(world.scene,world.camera,width,height);
  const backdrop=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#dce8d5"/></svg>`);
  await writeFile(new URL(name+'.png',output),await sharp(backdrop).composite([{input:buffer}]).png().toBuffer());
  console.log(`Rendered ${name}.png from the actual starter scene graph (offline lighting, no browser UI).`);
}
