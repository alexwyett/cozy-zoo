import * as THREE from 'three';
import { TILE,cellKey } from './catalog.js';

export const PATH_DIRECTIONS=[{bit:1,dc:0,dr:-1},{bit:2,dc:1,dr:0},{bit:4,dc:0,dr:1},{bit:8,dc:-1,dr:0}];
// North, east, south, west. The two entrance tiles continue to the gate outside.
export function pathMask(paths,c,r,canConnect=()=>true){
  let mask=0;for(const {bit,dc,dr} of PATH_DIRECTIONS)if(paths.has(cellKey(c+dc,r+dr))&&canConnect(c+dc,r+dr))mask|=bit;
  if(r===9&&(c===5||c===6))mask|=4;return mask;
}
const surface=new THREE.MeshStandardMaterial({color:'#ecdfc2',roughness:1,flatShading:true});
const edge=new THREE.MeshStandardMaterial({color:'#c4b18b',roughness:1,flatShading:true});
const grass=new THREE.MeshStandardMaterial({color:'#a9cc81',roughness:1,flatShading:true});
const seam=new THREE.MeshStandardMaterial({color:'#d4c5a4',roughness:1,flatShading:true});
function box(root,x,y,z,w,h,d,material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.receiveShadow=true;root.add(m);}

// Matching texture-free tiles cover all 16 combinations, including ends and junctions.
// Each edge opening is exactly 1m wide, so adjacent tiles meet without gaps or kerbs.
export function createPathTile(mask){
  const root=new THREE.Group();root.name=`Path ${mask}`;root.userData.pathMask=mask;
  box(root,0,.075,0,TILE,.15,TILE,grass);
  const half=.50,extent=TILE/2,arm=extent-half;
  box(root,0,.164,0,1,.028,1,surface);
  const kerb=(x,z,w,d)=>box(root,x,.164,z,w,.028,d,edge);
  for(const {bit,dc,dr} of PATH_DIRECTIONS){
    if(mask&bit){
      box(root,dc*.75,.164,dr*.75,dc?arm:1,.028,dr?arm:1,surface);
      if(dc){for(const side of [-1,1])kerb(dc*.75,side*.515,arm,.03);box(root,dc*.75,.180,0,.012,.003,1,seam);}
      else{for(const side of [-1,1])kerb(side*.515,dr*.75,.03,arm);box(root,0,.180,dr*.75,1,.003,.012,seam);}
    }else kerb(dc*.515,dr*.515,dc?.03:1,dr?.03:1);
  }
  return root;
}
