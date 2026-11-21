import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AnimationMixer, Vector3 } from 'three';
import { listPack,loadPackFile,preciseBounds } from './cozy-pack.mjs';

const files=await listPack(),assets=[];
for(const file of files){
  const {gltf,json,bytes}=await loadPackFile(file);
  const bounds=preciseBounds(gltf.scene),size=bounds.getSize(new Vector3());
  assert.ok(size.toArray().every(Number.isFinite)&&size.length()>0,`${file}: invalid dimensions`);
  let triangles=0,primitives=0,skins=0;
  gltf.scene.traverse(node=>{if(node.isMesh){primitives++;if(node.isSkinnedMesh)skins++;triangles+=(node.geometry.index?.count??node.geometry.attributes.position.count)/3;}});
  const animations=[];
  for(const clip of gltf.animations){
    const mixer=new AnimationMixer(gltf.scene),action=mixer.clipAction(clip);action.play();
    const pose=(time)=>{
      mixer.setTime(time);gltf.scene.updateMatrixWorld(true);
      const sample=[];gltf.scene.traverse(node=>{if(node.isBone)sample.push(...node.matrixWorld.elements);});return sample;
    };
    const a=pose(0),b=pose(clip.duration*0.37),end=pose(clip.duration-0.00001);
    const movement=Math.max(0,...a.map((n,i)=>Math.abs(n-b[i])));
    const seam=Math.max(0,...a.map((n,i)=>Math.abs(n-end[i])));
    assert.ok(movement>0.00001,`${clip.name}: no bone movement`);
    assert.ok(seam<0.01,`${clip.name}: discontinuous loop`);
    animations.push({name:clip.name,duration:clip.duration,tracks:clip.tracks.length,verifiedBoneMovement:true,maxLoopDifference:seam});
    mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
  }
  assets.push({file:file.replaceAll('\\','/'),bytes,triangles,renderPrimitives:primitives,skinnedPrimitives:skins,dimensionsXYZ:size.toArray(),materials:json.materials?.length??0,embeddedImages:json.images?.length??0,animations});
}
const archive=await readFile(new URL('../.downloads/Zoo_Cozy_FREE_Sampler.zip',import.meta.url));
const report={source:'https://sandial.itch.io/cozy-zoo-low-poly-mega-modular-3d-pack',downloaded:'2026-11-18',archiveSha256:createHash('sha256').update(archive).digest('hex'),assetCount:assets.length,animalCount:assets.filter(a=>a.animations.length).length,animationCount:assets.reduce((n,a)=>n+a.animations.length,0),categories:[...new Set(assets.map(a=>a.file.split('/')[0]))],assets};
const output=new URL('../art-previews/cozy-zoo-free/',import.meta.url);await mkdir(output,{recursive:true});
await writeFile(new URL('inventory.json',output),JSON.stringify(report,null,2)+'\n');
console.log(`${report.assetCount} GLBs loaded; ${report.animalCount} animated animals; ${report.animationCount} clips checked for movement and loop continuity.`);
console.log(`Triangle range: ${Math.min(...assets.map(a=>a.triangles))}–${Math.max(...assets.map(a=>a.triangles))}`);
