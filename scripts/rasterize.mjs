import * as THREE from 'three';
import sharp from 'sharp';

// Deterministic offline renderer of the same meshes exported to GLB.
// Orthographic depth buffers, flat materials and a directional shadow map.
// No WebGL context, browser process, HTTP server or network access.
const light = new THREE.Vector3(-0.55,1,0.65).normalize();
function triangles(root, camera, width, height, shadow = false) {
  const result = []; root.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  root.traverse(node=>{if(node.isSkinnedMesh)node.skeleton.update();});
  const view = new THREE.Vector3(); camera.getWorldDirection(view).negate();
  root.traverse(mesh => {
    if (!mesh.isMesh || !mesh.visible || (shadow && !mesh.castShadow)) return;
    for(let ancestor=mesh.parent;ancestor;ancestor=ancestor.parent)if(!ancestor.visible)return;
    const positions = mesh.geometry.attributes.position, index = mesh.geometry.index;
    const normals=mesh.geometry.attributes.normal,colors=mesh.material.vertexColors?mesh.geometry.attributes.color:null,normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    const vertices = [];
    for (let i=0; i<positions.count; i++) {
      const local=mesh.getVertexPosition(i,new THREE.Vector3());
      const world = local.clone().applyMatrix4(mesh.matrixWorld);
      let normal;
      if(!shadow && normals && !mesh.material.flatShading){
        normal=new THREE.Vector3().fromBufferAttribute(normals,i);
        if(mesh.isSkinnedMesh)normal=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(positions,i).add(normal)).sub(local);
        normal.applyMatrix3(normalMatrix).normalize();
      }
      const projected = world.clone().project(camera);
      vertices.push({ x:(projected.x+1)*width/2,y:(1-projected.y)*height/2,z:projected.z,world,color:colors?new THREE.Color().fromBufferAttribute(colors,i):null,light:normal?Math.max(0,normal.dot(light)):undefined });
    }
    for (let i=0; i<(index?.count??positions.count); i+=3) {
      const a=vertices[index?index.getX(i):i], b=vertices[index?index.getX(i+1):i+1], c=vertices[index?index.getX(i+2):i+2];
      const normal=b.world.clone().sub(a.world).cross(c.world.clone().sub(a.world)).normalize();
      if (normal.dot(view)<=0) continue;
      const minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))), maxX=Math.min(width-1,Math.ceil(Math.max(a.x,b.x,c.x)));
      const minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))), maxY=Math.min(height-1,Math.ceil(Math.max(a.y,b.y,c.y)));
      const area=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
      if(Math.abs(area)<1e-8 || maxX<minX || maxY<minY)continue;
      result.push({a,b,c,normal,minX,maxX,minY,maxY,area,material:mesh.material,receives:mesh.receiveShadow});
    }
  });
  return result;
}
function raster(tris, width, height, visit) {
  const depth = new Float32Array(width*height).fill(Infinity);
  for (const t of tris) {
    const {a,b,c,area}=t;
    for(let y=t.minY;y<=t.maxY;y++)for(let x=t.minX;x<=t.maxX;x++) {
      const u=((b.y-c.y)*(x+0.5-c.x)+(c.x-b.x)*(y+0.5-c.y))/area;
      const v=((c.y-a.y)*(x+0.5-c.x)+(a.x-c.x)*(y+0.5-c.y))/area, w=1-u-v;
      if(u<0 || v<0 || w<0)continue;
      const z=u*a.z+v*b.z+w*c.z, p=y*width+x;
      if(z>=depth[p])continue;
      depth[p]=z; if(visit)visit(t,p,u,v,w);
    }
  }
  return depth;
}
export async function render(root,camera,width,height,{shadow=true}={}) {
  const pixels=Buffer.alloc(width*height*4), shadowSize=1536;
  let lightCamera,shadowDepth,lightMatrix;
  if(shadow) {
    lightCamera=new THREE.OrthographicCamera(-15,15,15,-15,0.1,90);
    lightCamera.position.copy(light.clone().multiplyScalar(32)); lightCamera.lookAt(0,0,0); lightCamera.updateMatrixWorld(true);
    lightMatrix=new THREE.Matrix4().multiplyMatrices(lightCamera.projectionMatrix,lightCamera.matrixWorldInverse);
    shadowDepth=raster(triangles(root,lightCamera,shadowSize,shadowSize,true),shadowSize,shadowSize);
  }
  const colour=new THREE.Color(),world=new THREE.Vector3();
  const tris=triangles(root,camera,width,height);
  for(const t of tris) {
    const facing=Math.max(0,t.normal.dot(light));
    t.shade=0.72+0.30*facing;
  }
  raster(tris,width,height,(t,p,u,v,w)=>{
    let occlusion=0;
    if(shadow && t.receives && t.normal.dot(light)>0) {
      world.set(0,0,0).addScaledVector(t.a.world,u).addScaledVector(t.b.world,v).addScaledVector(t.c.world,w).applyMatrix4(lightMatrix);
      const sx=(world.x+1)*shadowSize/2,sy=(1-world.y)*shadowSize/2;
      for(const dx of [-1,0,1])for(const dy of [-1,0,1]) {
        const x=Math.floor(sx)+dx,y=Math.floor(sy)+dy;
        if(x>=0&&y>=0&&x<shadowSize&&y<shadowSize&&world.z>shadowDepth[y*shadowSize+x]+0.0022)occlusion+=1/9;
      }
    }
    const shade=t.a.light===undefined?t.shade:0.72+0.30*(t.a.light*u+t.b.light*v+t.c.light*w);
    colour.copy(t.material.color).multiplyScalar(shade*(1-occlusion*0.24));
    if(t.a.color){colour.r*=t.a.color.r*u+t.b.color.r*v+t.c.color.r*w;colour.g*=t.a.color.g*u+t.b.color.g*v+t.c.color.g*w;colour.b*=t.a.color.b*u+t.b.color.b*v+t.c.color.b*w;}
    const hex=colour.getHex(THREE.SRGBColorSpace),o=p*4;
    pixels[o]=hex>>16&255; pixels[o+1]=hex>>8&255; pixels[o+2]=hex&255; pixels[o+3]=255;
  });
  return sharp(pixels,{raw:{width,height,channels:4}}).png().toBuffer();
}
