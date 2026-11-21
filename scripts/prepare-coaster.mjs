import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { Color,SRGBColorSpace } from 'three';
import sharp from 'sharp';

const source=new URL('../assets/vendor/kenney-coaster-kit/Models/GLB%20format/',import.meta.url),out=new URL('../assets/railway/kenney/',import.meta.url);await mkdir(out,{recursive:true});
const palette=await sharp(await readFile(new URL('Textures/colormap.png',source))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const names=['coaster-wood-straight','coaster-wood-corner-small','coaster-train-front','coaster-train','station','ride-entrance'];
for(const name of names){
  const input=await readFile(new URL(name+'.glb',source)),len=input.readUInt32LE(12),json=JSON.parse(input.subarray(20,20+len).toString()),binary=input.subarray(28+len);const chunks=[binary];let offset=binary.length;
  for(const mesh of json.meshes)for(const primitive of mesh.primitives){
    const accessor=json.accessors[primitive.attributes.TEXCOORD_0],view=json.bufferViews[accessor.bufferView],colors=Buffer.alloc(accessor.count*12),color=new Color();
    if(accessor.componentType!==5126)throw new Error('Unexpected UV format');
    for(let i=0;i<accessor.count;i++){
      const at=(view.byteOffset??0)+(accessor.byteOffset??0)+i*(view.byteStride??8),x=Math.min(palette.info.width-1,Math.max(0,Math.floor(binary.readFloatLE(at)*palette.info.width))),y=Math.min(palette.info.height-1,Math.max(0,Math.floor(binary.readFloatLE(at+4)*palette.info.height))),p=(y*palette.info.width+x)*4;
      color.setRGB(palette.data[p]/255,palette.data[p+1]/255,palette.data[p+2]/255,SRGBColorSpace);colors.writeFloatLE(color.r,i*12);colors.writeFloatLE(color.g,i*12+4);colors.writeFloatLE(color.b,i*12+8);
    }
    const bufferView=json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:colors.length,target:34962})-1;primitive.attributes.COLOR_0=json.accessors.push({bufferView,componentType:5126,count:accessor.count,type:'VEC3'})-1;chunks.push(colors);offset+=colors.length;
  }
  for(const material of json.materials){delete material.pbrMetallicRoughness.baseColorTexture;material.pbrMetallicRoughness.baseColorFactor=[1,1,1,1];material.pbrMetallicRoughness.roughnessFactor=1;material.name='coaster-palette';}
  if(name.startsWith('coaster-wood-'))for(const node of json.nodes)if(node.translation)node.translation[1]=0;
  delete json.images;delete json.textures;delete json.samplers;delete json.extensionsUsed;json.buffers[0].byteLength=offset;
  let text=Buffer.from(JSON.stringify(json));text=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]);const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+text.length+offset,8);header.writeUInt32LE(text.length,12);header.writeUInt32LE(0x4e4f534a,16);const bh=Buffer.alloc(8);bh.writeUInt32LE(offset);bh.writeUInt32LE(0x004e4942,4);await writeFile(new URL(name+'.glb',out),Buffer.concat([header,text,bh,...chunks]));
}
await writeFile(new URL('LICENSE.txt',out),await readFile(new URL('../assets/vendor/kenney-coaster-kit/License.txt',import.meta.url)));
await writeFile(new URL('SOURCE.txt',out),'Kenney Coaster Kit 1.0 · CC0\nhttps://kenney.nl/assets/coaster-kit\nSix selected models. Palette baked into vertex colours; flat-track origin height normalised by scripts/prepare-coaster.mjs. Meshes are Kenney’s.\n');
console.log('Prepared six Kenney Coaster Kit assets with embedded colours.');
