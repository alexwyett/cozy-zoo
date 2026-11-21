import { mkdir, writeFile } from 'node:fs/promises';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { ANIMALS } from '../src/models.js';
import { makeZoo } from '../src/scene.js';

// GLTFExporter needs FileReader for binary buffers; no browser is needed.
globalThis.FileReader ??= class {
  async readAsArrayBuffer(blob) { this.result=await blob.arrayBuffer(); this.onloadend?.(); }
  async readAsDataURL(blob) { this.result=`data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`; this.onloadend?.(); }
};
const out=new URL('../assets/models/',import.meta.url); await mkdir(out,{recursive:true});
const exporter=new GLTFExporter();
for(const [name,make] of [...Object.entries(ANIMALS),['zoo-diorama',makeZoo]]) {
  const root=make(); root.updateMatrixWorld(true);
  const glb=await exporter.parseAsync(root,{binary:true,onlyVisible:true});
  const buffer=Buffer.from(glb);
  if(buffer.readUInt32LE(0)!==0x46546c67 || buffer.readUInt32LE(4)!==2 || buffer.readUInt32LE(8)!==buffer.length)throw new Error(`Invalid GLB: ${name}`);
  await writeFile(new URL(`${name}.glb`,out),buffer);
  console.log(`Exported ${name}.glb (${Math.round(buffer.length/1024)} KB)`);
}
