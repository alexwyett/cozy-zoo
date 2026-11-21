import { worldCell,cellKey,neighbors,normalizeRotation } from './catalog.js';

export const PATH_HEIGHT=.18,BRIDGE_HEIGHT=1.65,BRIDGE_HALF_WIDTH=.57;
export const isBridge=b=>b?.type==='rail-crossing'&&b.levelCrossing!==true;
export function bridgeCells(b){
  const horizontal=normalizeRotation(b.rotation)%2===0;
  return [-1,0,1].map(offset=>({c:b.c+(horizontal?offset:0),r:b.r+(horizontal?0:offset)}));
}
export const bridgeAt=(s,c,r)=>s.buildings.find(b=>isBridge(b)&&bridgeCells(b).some(p=>p.c===c&&p.r===r));
export function pathNeighbors(s,c,r){
  const axis=bridgeAt(s,c,r),horizontal=axis&&normalizeRotation(axis.rotation)%2===0;
  return neighbors(c,r).filter(p=>{
    if(axis&&(horizontal?p.r!==r:p.c!==c))return false;
    const other=bridgeAt(s,p.c,p.r);
    return !other||(normalizeRotation(other.rotation)%2===0?p.r===r:p.c===c);
  });
}
export function bridgeHeightAt(b,x,z){
  const p=worldCell(b.c,b.r),horizontal=normalizeRotation(b.rotation)%2===0;
  const along=Math.abs(horizontal?x-p.x:z-p.z),across=Math.abs(horizontal?z-p.z:x-p.x);
  if(across>BRIDGE_HALF_WIDTH||along>=3)return PATH_HEIGHT;
  return PATH_HEIGHT+(BRIDGE_HEIGHT-PATH_HEIGHT)*(along<=1?1:(3-along)/2);
}
export function visitorHeight(s,x,z){
  return s.buildings.filter(isBridge).reduce((height,b)=>Math.max(height,bridgeHeightAt(b,x,z)),PATH_HEIGHT);
}
export const bridgeOccupied=(s,b)=>s.visitors.some(v=>v.stage!=='riding'&&bridgeHeightAt(b,v.x,v.z)>PATH_HEIGHT+.01);
export function withBridge(s,b){
  return {...s,buildings:[...s.buildings.filter(item=>item.id!==b.id),b],paths:[...new Set([...s.paths,...bridgeCells(b).map(p=>cellKey(p.c,p.r))])]};
}
