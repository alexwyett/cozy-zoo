import * as THREE from 'three';
import { PATH_HEIGHT,BRIDGE_HEIGHT } from './bridges.js';

const wood=new THREE.MeshStandardMaterial({color:'#c49a6c',roughness:1,flatShading:true});
const trim=new THREE.MeshStandardMaterial({color:'#7b9c80',roughness:1,flatShading:true});
const planks=new THREE.MeshStandardMaterial({color:'#e0bd8a',roughness:1,flatShading:true});
function beam(root,a,b,width,depth,material){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,direction.length(),depth),material);
  mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
}
export function createFootbridge(){
  const root=new THREE.Group();root.name='Wooden footbridge';
  const top=x=>PATH_HEIGHT+(BRIDGE_HEIGHT-PATH_HEIGHT)*(Math.abs(x)<=1?1:(3-Math.abs(x))/2);
  for(let i=0;i<30;i++){
    const x=-2.9+i*.2,sloped=Math.abs(x)>1,mesh=new THREE.Mesh(new THREE.BoxGeometry(sloped?.247:.195,.10,1.10),i%3?planks:wood);
    mesh.position.set(x,top(x)-.05,0);mesh.rotation.z=sloped?(x<0?1:-1)*Math.atan((BRIDGE_HEIGHT-PATH_HEIGHT)/2):0;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  }
  for(const side of [-1,1]){
    for(const x of [-2.95,-2,-1,0,1,2,2.95])beam(root,[x,top(x)-.09,side*.57],[x,top(x)+.53,side*.57],.065,.065,trim);
    for(const [a,b] of [[-2.95,-1],[-1,1],[1,2.95]])for(const height of [.25,.52])beam(root,[a,top(a)+height,side*.57],[b,top(b)+height,side*.57],.06,.06,trim);
    for(const x of [-.88,.88])beam(root,[x,.15,side*.5],[x,BRIDGE_HEIGHT-.1,side*.5],.12,.12,wood);
  }
  return root;
}
