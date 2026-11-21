import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import { readFile,access,readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createGame } from '../src/game/simulation.js';
import { startupAssetKeys } from '../src/game/asset-plan.js';

const root=new URL('../',import.meta.url),out=new URL('dist/',root);let html,report,manifest;
before(async()=>{
  await promisify(execFile)(process.execPath,['scripts/build-game.mjs'],{cwd:fileURLToPath(root)});
  html=await readFile(new URL('index.html',out),'utf8');report=JSON.parse(await readFile(new URL('build-report.json',out),'utf8'));manifest=JSON.parse(await readFile(new URL('assets/manifest.json',out),'utf8'));
});
test('web build has a small initial loader, real code splitting and no embedded models',async()=>{
  assert.ok(Buffer.byteLength(html)<10000);assert.ok(!html.includes('base64'));assert.ok(html.includes('id="boot-screen"'));assert.ok(report.chunks.length>=3);
  const boot=html.match(/<script type="module" src="([^"]+)"/)[1];await access(new URL(boot,out));
  for(const chunk of report.chunks){const code=await readFile(new URL(chunk.file,out),'utf8');for(const [,path] of code.matchAll(/(?:from|import)\s*\(?\s*["'](\.[^"']+\.js)["']/g))await access(new URL(path,new URL(chunk.file,out)));}
  assert.ok(report.startupModelCount<report.totalModels);assert.ok(report.startupModelBytes<report.modelBytes);
});
test('every model and thumbnail URL resolves to a valid content-hashed file',async()=>{
  let bytes=0;for(const model of Object.values(manifest.models)){
    const buffer=await readFile(new URL(model.url,out));assert.equal(buffer.readUInt32LE(0),0x46546c67);assert.equal(buffer.readUInt32LE(8),buffer.length);assert.equal(buffer.length,model.bytes);assert.ok(model.url.includes(createHash('sha256').update(buffer).digest('hex').slice(0,12)));bytes+=buffer.length;
  }
  assert.equal(bytes,report.modelBytes);
  for(const path of Object.values(manifest.thumbnails)){const buffer=await readFile(new URL(path,out));assert.equal(buffer.toString('ascii',0,4),'RIFF');assert.equal(buffer.toString('ascii',8,12),'WEBP');}
  assert.equal(startupAssetKeys(createGame()).reduce((n,key)=>n+manifest.models[key].bytes,0),report.startupModelBytes);
  assert.ok((await readFile(new URL('THIRD_PARTY_NOTICES.txt',out),'utf8')).includes('FARM ANIMALS BY QUATERNIUS'));
});
test('generated chunk inventory matches disk without stale JavaScript accumulating',async()=>{
  const inventory=JSON.parse(await readFile(new URL('.generated-files.json',out),'utf8'));
  const visit=async(dir,prefix='')=>{const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const name=prefix+entry.name;if(entry.isDirectory())result.push(...await visit(join(dir,entry.name),name+'/'));else result.push(name);}return result;};
  for(const name of await visit(fileURLToPath(new URL('js/',out)),'js/'))assert.ok(inventory.includes(name),name);
});
