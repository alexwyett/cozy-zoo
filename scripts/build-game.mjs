import { readFile,writeFile,mkdir,unlink } from 'node:fs/promises';
import { dirname,relative,resolve,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build,transform } from 'esbuild';
import sharp from 'sharp';
import { ASSETS,assetFile } from '../src/game/catalog.js';
import { startupAssetKeys } from '../src/game/asset-plan.js';
import { createGame } from '../src/game/simulation.js';

const root=new URL('../',import.meta.url),output=new URL('dist/',root);await mkdir(output,{recursive:true});
let previous=[];try{previous=JSON.parse(await readFile(new URL('.generated-files.json',output),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
// Adopt outputs from the first web build so future builds remove stale chunks.
if(!previous.length)try{
  const report=JSON.parse(await readFile(new URL('build-report.json',output),'utf8')),manifest=JSON.parse(await readFile(new URL('assets/manifest.json',output),'utf8')),html=await readFile(new URL('index.html',output),'utf8');
  previous=[...report.chunks.map(c=>c.file),...Object.values(manifest.models).map(m=>m.url.replace(/^\.\//,'')),...Object.values(manifest.thumbnails).map(url=>url.replace(/^\.\//,'')),...Array.from(html.matchAll(/href="\.\/(assets\/game-[a-f0-9]+\.css)"/g),m=>m[1])];
}catch(error){if(error.code!=='ENOENT')throw error;}
const generated=new Set();
const hash=buffer=>createHash('sha256').update(buffer).digest('hex').slice(0,12);
async function emit(path,bytes){const target=new URL(path,output);await mkdir(dirname(fileURLToPath(target)),{recursive:true});await writeFile(target,bytes);generated.add(path);}
const manifest={version:1,models:{},thumbnails:{}};let modelBytes=0,thumbnailBytes=0;
async function thumbnail(key,source){
  let image;try{image=await readFile(source);}catch(error){if(error.code==='ENOENT')return;throw error;}
  const buffer=await sharp(image).resize({width:256,height:220,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
  const path=`assets/thumbs/${key}-${hash(buffer)}.webp`;await emit(path,buffer);manifest.thumbnails[key]='./'+path;thumbnailBytes+=buffer.length;
}
for(const [key,file] of Object.entries(ASSETS)){
  const buffer=await readFile(new URL(assetFile(key),root)),path=`assets/models/${key}-${hash(buffer)}.glb`;
  await emit(path,buffer);manifest.models[key]={url:'./'+path,bytes:buffer.length};modelBytes+=buffer.length;
  if(key!=='farm-sheep')await thumbnail(key,new URL(`art-previews/cozy-zoo-free/individual/${file.split('/').at(-1).replace('.glb','.png')}`,root));
}
await thumbnail('farm-sheep',new URL('art-previews/shop/petting.png',root));
for(const key of ['station','rail-straight','rail-corner','rail-crossing'])await thumbnail(key,new URL(`art-previews/shop/${key}.png`,root));
await emit('assets/manifest.json',JSON.stringify(manifest));
const result=await build({entryPoints:{boot:fileURLToPath(new URL('src/game/boot.js',root))},outdir:fileURLToPath(output),entryNames:'js/[name]-[hash]',chunkNames:'js/chunks/[name]-[hash]',bundle:true,splitting:true,format:'esm',platform:'browser',target:'es2022',minify:true,write:false,metafile:true,legalComments:'none'});
let scriptBytes=0;
for(const file of result.outputFiles){await emit(relative(fileURLToPath(output),file.path).replaceAll('\\','/'),file.contents);scriptBytes+=file.contents.length;}
const boot=Object.entries(result.metafile.outputs).find(([,info])=>info.entryPoint?.replaceAll('\\','/').endsWith('/boot.js'))?.[0];
if(!boot)throw new Error('Missing loader entry');
const bootPath=relative(fileURLToPath(output),boot).replaceAll('\\','/');
const css=(await transform(await readFile(new URL('src/game/game.css',root),'utf8'),{loader:'css',minify:true})).code,cssPath=`assets/game-${hash(css)}.css`;await emit(cssPath,css);
const critical=`<style>#boot-screen{position:fixed;inset:0;z-index:40;background:#edf0df;color:#294b40;display:grid;place-items:center;text-align:center;font:16px system-ui,sans-serif}#boot-screen>div{max-width:360px;padding:28px}#boot-screen h1{font-size:30px;line-height:1.2}#boot-screen p{font-size:13px;line-height:1.6;color:#71856b}.boot-mark{display:grid;place-items:center;margin:auto;width:76px;height:76px;border-radius:25px;background:#416b54;color:#f5ecd6;font-size:49px}.boot-track{display:block;overflow:hidden;height:6px;background:#d8e2cc;border-radius:8px;margin-top:26px}.boot-track i{display:block;width:35%;height:100%;background:#82a376;animation:boot-slide 1.5s ease-in-out infinite alternate}#boot-retry{min-height:44px;padding:10px 24px;margin-top:22px;border:0;border-radius:12px;color:#fff8e7;background:#416b54;cursor:pointer}@keyframes boot-slide{to{transform:translateX(185%)}}@media(prefers-reduced-motion:reduce){.boot-track i{animation:none;width:100%}}</style>`;
const fileHint=`<script>if(location.protocol==='file:'){document.querySelector('#boot-caption').textContent='This version opens through a web server. Start npm run preview, then visit http://127.0.0.1:4173. To transfer your old zoo, export it here and import it from the new game’s Guide.';document.querySelector('.boot-track').hidden=true;try{var saved=localStorage.getItem('pocket-zoo-starter-v1');if(saved){var button=document.createElement('button');button.textContent='Export saved zoo';button.style.cssText='min-height:44px;padding:12px;margin-top:20px';button.onclick=function(){var url=URL.createObjectURL(new Blob([saved],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='pocket-zoo-save.json';link.click();setTimeout(function(){URL.revokeObjectURL(url)},1000)};document.querySelector('#boot-screen>div').append(button)}}catch(e){document.querySelector('#boot-caption').textContent+=' Saved data is unavailable in this browser.'}}</script>`;
let html=await readFile(new URL('play.html',root),'utf8');
html=html.replace('<link rel="stylesheet" href="src/game/game.css">',critical+`<link rel="stylesheet" href="./${cssPath}">`);
html=html.replace('src="src/game/boot.js"',`src="./${bootPath}"`).replace('<!-- FILE_PROTOCOL_HINT -->',fileHint);
await emit('index.html',html);
const notices='Cozy Zoo uses Three.js (MIT), Cozy Zoo by Sandial, Kenney Mini Characters and Coaster Kit (CC0), and Quaternius Farm Animals (CC0).\n\nTHREE.JS\n'+await readFile(new URL('node_modules/three/LICENSE',root),'utf8')+'\n\nCOZY ZOO BY SANDIAL\n'+await readFile(new URL('assets/vendor/sandial-cozy-zoo-free/LICENSE.txt',root),'utf8')+'\n\nMINI CHARACTERS BY KENNEY\n'+await readFile(new URL('assets/characters/kenney/LICENSE.txt',root),'utf8')+'\n\nFARM ANIMALS BY QUATERNIUS\n'+await readFile(new URL('assets/animals/quaternius/LICENSE.txt',root),'utf8');
await emit('THIRD_PARTY_NOTICES.txt',notices+'\n\nCOASTER KIT BY KENNEY\n'+await readFile(new URL('assets/railway/kenney/LICENSE.txt',root),'utf8'));
const starterKeys=startupAssetKeys(createGame()),report={htmlBytes:Buffer.byteLength(html),scriptBytes,cssBytes:Buffer.byteLength(css),modelBytes,thumbnailBytes,startupModelCount:starterKeys.length,startupModelBytes:starterKeys.reduce((n,key)=>n+manifest.models[key].bytes,0),totalModels:Object.keys(manifest.models).length,chunks:result.outputFiles.map(file=>({file:relative(fileURLToPath(output),file.path).replaceAll('\\','/'),bytes:file.contents.length}))};
await emit('build-report.json',JSON.stringify(report,null,2));
for(const path of previous)if(!generated.has(path)){
  const absolute=resolve(fileURLToPath(output),path);
  if(!absolute.startsWith(resolve(fileURLToPath(output))+sep))throw new Error('Refusing to remove an output outside dist/');
  try{await unlink(absolute);}catch(error){if(error.code!=='ENOENT')throw error;}
}
await writeFile(new URL('.generated-files.json',output),JSON.stringify([...generated]));
console.log(`Built web game: index.html ${(report.htmlBytes/1024).toFixed(1)} KB; ${report.chunks.length} JS chunks (${(scriptBytes/1024).toFixed(0)} KB total).`);
console.log(`Startup: ${report.startupModelCount}/${report.totalModels} models, ${(report.startupModelBytes/1024/1024).toFixed(2)} MB. Other models load when selected. Serve dist/ over HTTP.`);
