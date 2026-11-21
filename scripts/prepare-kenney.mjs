import { readFile,writeFile,mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import { Color,SRGBColorSpace } from 'three';

// Bake Kenney's flat palette UVs into vertex colours, avoiding texture requests
// when the game is opened directly from disk. Meshes, rigs and clips stay Kenney's.
const source=new URL('../assets/vendor/kenney-mini-characters/Models/GLB%20format/',import.meta.url);
const output=new URL('../assets/characters/kenney/',import.meta.url);await mkdir(output,{recursive:true});
const palette=await sharp(await readFile(new URL('Textures/colormap.png',source))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const names=[...'abcdef'].map(c=>'female-'+c).concat([...'abcdefg'].map(c=>'male-'+c));
for(const name of names){
  const input=await readFile(new URL('character-'+name+'.glb',source));
  const length=input.readUInt32LE(12),json=JSON.parse(input.subarray(20,20+length).toString()),binary=input.subarray(28+length);
  const chunks=[binary];let offset=binary.length;
  for(const mesh of json.meshes)for(const primitive of mesh.primitives){
    const uv=json.accessors[primitive.attributes.TEXCOORD_0],view=json.bufferViews[uv.bufferView];
    if(uv.componentType!==5126||uv.type!=='VEC2')throw new Error('Unexpected palette UV format');
    const colors=Buffer.alloc(uv.count*12),color=new Color();
    for(let i=0;i<uv.count;i++){
      const at=(view.byteOffset??0)+(uv.byteOffset??0)+i*(view.byteStride??8);
      const x=Math.max(0,Math.min(palette.info.width-1,Math.floor(binary.readFloatLE(at)*palette.info.width)));
      const y=Math.max(0,Math.min(palette.info.height-1,Math.floor(binary.readFloatLE(at+4)*palette.info.height)));
      const pixel=(y*palette.info.width+x)*4;
      color.setRGB(palette.data[pixel]/255,palette.data[pixel+1]/255,palette.data[pixel+2]/255,SRGBColorSpace);
      colors.writeFloatLE(color.r,i*12);colors.writeFloatLE(color.g,i*12+4);colors.writeFloatLE(color.b,i*12+8);
    }
    const bufferView=json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:colors.length,target:34962})-1;
    primitive.attributes.COLOR_0=json.accessors.push({bufferView,componentType:5126,count:uv.count,type:'VEC3'})-1;
    chunks.push(colors);offset+=colors.length;
  }
  for(const m of json.materials){delete m.pbrMetallicRoughness.baseColorTexture;m.pbrMetallicRoughness.baseColorFactor=[1,1,1,1];m.pbrMetallicRoughness.roughnessFactor=1;}
  delete json.images;delete json.textures;delete json.samplers;
  json.animations=json.animations.filter(clip=>['idle','walk','sit'].includes(clip.name));
  // Drop binary tracks for unused animations and UVs after baking the palette.
  const oldAccessors=json.accessors,oldViews=json.bufferViews,accessors=[],views=[],packed=[],accessorMap=new Map(),viewMap=new Map(),fullBinary=Buffer.concat(chunks);let packedOffset=0;
  const useView=index=>{
    if(!viewMap.has(index)){
      const view=oldViews[index],data=fullBinary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength),padding=Buffer.alloc((4-data.length%4)%4);
      viewMap.set(index,views.length);views.push({...view,byteOffset:packedOffset});packed.push(data,padding);packedOffset+=data.length+padding.length;
    }return viewMap.get(index);
  };
  const useAccessor=index=>{
    if(!accessorMap.has(index)){
      const accessor=oldAccessors[index];if(accessor.sparse)throw new Error('Unexpected sparse accessor');
      accessorMap.set(index,accessors.length);accessors.push({...accessor,bufferView:useView(accessor.bufferView)});
    }return accessorMap.get(index);
  };
  for(const mesh of json.meshes)for(const primitive of mesh.primitives){
    delete primitive.attributes.TEXCOORD_0;
    for(const key of Object.keys(primitive.attributes))primitive.attributes[key]=useAccessor(primitive.attributes[key]);
    if(primitive.indices!==undefined)primitive.indices=useAccessor(primitive.indices);
  }
  for(const skin of json.skins??[])if(skin.inverseBindMatrices!==undefined)skin.inverseBindMatrices=useAccessor(skin.inverseBindMatrices);
  for(const animation of json.animations)for(const sampler of animation.samplers){sampler.input=useAccessor(sampler.input);sampler.output=useAccessor(sampler.output);}
  json.accessors=accessors;json.bufferViews=views;chunks.splice(0,chunks.length,...packed);offset=packedOffset;
  delete json.extensionsUsed;delete json.extensionsRequired;
  json.buffers[0].byteLength=offset;
  let text=Buffer.from(JSON.stringify(json));text=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]);
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+text.length+offset,8);header.writeUInt32LE(text.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(offset);binHeader.writeUInt32LE(0x004e4942,4);
  await writeFile(new URL(name+'.glb',output),Buffer.concat([header,text,binHeader,...chunks]));
}
await writeFile(new URL('LICENSE.txt',output),await readFile(new URL('../assets/vendor/kenney-mini-characters/License.txt',import.meta.url)));
await writeFile(new URL('SOURCE.txt',output),'Kenney Mini Characters 2.0 (CC0)\nhttps://kenney.nl/assets/mini-characters\n\n13 civilian characters, with original idle/walk/sit clips. Palette sampled into linear vertex colours by scripts/prepare-kenney.mjs; geometry and animation are from Kenney. Original archive remains in assets/vendor/kenney-mini-characters.\n');
console.log(`Prepared ${names.length} Kenney civilian characters, with embedded colours and idle/walk/sit animations.`);
