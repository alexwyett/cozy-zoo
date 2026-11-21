import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ANIMALS } from '../src/models.js';
import { makeZoo } from '../src/scene.js';

for (const [name,make] of [...Object.entries(ANIMALS),['zoo-diorama',makeZoo]]) {
  const source=make(); source.updateMatrixWorld(true);
  let triangles=0;
  source.traverse(node=>{
    if(!node.isMesh)return;
    for(const value of node.geometry.attributes.position.array)assert.ok(Number.isFinite(value),`${name}: invalid vertex`);
    triangles+=(node.geometry.index?.count??node.geometry.attributes.position.count)/3;
  });
  const bytes=await readFile(new URL(`../assets/models/${name}.glb`,import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const expected=new THREE.Box3().setFromObject(source),actual=new THREE.Box3().setFromObject(gltf.scene);
  assert.ok(expected.min.distanceTo(actual.min)<0.001 && expected.max.distanceTo(actual.max)<0.001,`${name}: GLB bounds changed`);
  assert.equal(gltf.animations.length,0,'Art study is intentionally static');
  console.log(`${name}: ${triangles.toLocaleString()} triangles; finite geometry; GLB round-trip verified`);
}
