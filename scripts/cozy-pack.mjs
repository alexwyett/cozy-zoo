import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const packRoot=new URL('../assets/vendor/sandial-cozy-zoo-free/',import.meta.url);
export async function listPack(){
  return (await readdir(new URL('GLB/',packRoot),{recursive:true})).filter(file=>file.endsWith('.glb')).sort();
}
export async function loadPackFile(file){
  const bytes=await readFile(new URL(`GLB/${file.replaceAll('\\','/')}`,packRoot));
  if(bytes.readUInt32LE(0)!==0x46546c67)throw new Error(`Invalid GLB: ${file}`);
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  for(const item of [...(json.buffers??[]),...(json.images??[])])if(item.uri && !item.uri.startsWith('data:'))throw new Error(`External resource in ${file}`);
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  gltf.scene.traverse(node=>{
    if(node.name.startsWith('UCX_'))node.visible=false;
    if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}
  });
  gltf.scene.updateMatrixWorld(true);
  return {gltf,json,bytes:bytes.length,file};
}
export function preciseBounds(root){
  root.updateMatrixWorld(true);root.traverse(node=>{if(node.isSkinnedMesh){node.skeleton.update();node.computeBoundingBox();}});
  return new THREE.Box3().setFromObject(root,true);
}
export function frameCamera(root,aspect=1.15){
  const bounds=preciseBounds(root),center=bounds.getCenter(new THREE.Vector3());
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,0.01,250);
  camera.position.copy(center).add(new THREE.Vector3(7,5.2,10));camera.lookAt(center);camera.updateMatrixWorld(true);
  const viewBounds=new THREE.Box3();
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])viewBounds.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  const height=Math.max(viewBounds.max.y-viewBounds.min.y,(viewBounds.max.x-viewBounds.min.x)/aspect)*1.17;
  camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();return camera;
}
export function shortName(file){return file.replaceAll('\\','/').split('/').at(-1).replace(/^ZOO_/,'').replace(/\.glb$/,'').replace(/_\d+x\d+$/,'').replace(/_/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2');}
export const sourcePath=fileURLToPath(packRoot);
