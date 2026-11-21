import { worldCell,gridCell,cellKey } from './catalog.js';
import { pathNeighbors,bridgeAt } from './bridges.js';

export const VISITOR_SCALE=.7,VISITOR_RADIUS=.18,VISITOR_SPACING=VISITOR_RADIUS*2+.02;
const lane=.24;
export const onFoot=v=>v.stage!=='riding';
export function walkable(s,x,z){
  if(z>=9&&z<=12.4&&Math.abs(x)<=1.3)return true;
  const p=gridCell(x,z);if(!s.paths.includes(cellKey(p.c,p.r)))return false;
  const center=worldCell(p.c,p.r),dx=x-center.x,dz=z-center.z,half=bridgeAt(s,p.c,p.r)?.type? .280001:.48;
  if(Math.abs(dx)<=half&&Math.abs(dz)<=half)return true;
  const allowed=pathNeighbors(s,p.c,p.r).filter(q=>s.paths.includes(cellKey(q.c,q.r)));
  return Math.abs(dz)<=half&&allowed.some(q=>q.c===p.c+Math.sign(dx)&&q.r===p.r)||Math.abs(dx)<=half&&allowed.some(q=>q.r===p.r+Math.sign(dz)&&q.c===p.c);
}
function place(s,v,x,z){
  if(walkable(s,x,z)){v.x=x;v.z=z;return true;}
  return false;
}
function waypoint(s,v){
  const goal=v.route[0];
  if(v.crowdNode!==goal){const center=goal.c!==undefined&&(goal.c!==v.cell.c||goal.r!==v.cell.r)?worldCell(v.cell.c,v.cell.r):v,dx=goal.x-center.x,dz=goal.z-center.z,length=Math.hypot(dx,dz)||1;v.crowdNode=goal;v.crowdDirection={x:dx/length,z:dz/length};delete v.crowdGoal;}
  const {x:dx,z:dz}=v.crowdDirection,length=1;
  // Keep to the right so opposing traffic can pass on narrow paths and bridges.
  if(v.route.length>1)return {x:goal.x-dz/length*lane,z:goal.z+dx/length*lane};
  v.crowdGoal??={x:goal.x,z:goal.z};
  if(v.crowdGoal.forX!==goal.x||v.crowdGoal.forZ!==goal.z){
    const slots=[];
    for(const along of [-.72,-.24,.24,.72])for(const side of [bridgeAt(s,goal.c,goal.r)? .27:.44]){
      const x=goal.x+dx/length*along-dz/length*side,z=goal.z+dz/length*along+dx/length*side;
      if(walkable(s,x,z))slots.push({x,z});
    }
    slots.sort((a,b)=>Math.hypot(a.x-v.x,a.z-v.z)-Math.hypot(b.x-v.x,b.z-v.z));
    const free=slots.find(p=>s.visitors.every(other=>other===v||!onFoot(other)||(Math.hypot(other.x-p.x,other.z-p.z)>=VISITOR_SPACING&&(!other.crowdGoal||Math.hypot(other.crowdGoal.x-p.x,other.crowdGoal.z-p.z)>=VISITOR_SPACING))));
    v.crowdGoal={...(free??slots[0]??goal),forX:goal.x,forZ:goal.z};
  }
  return v.crowdGoal;
}
export function separateVisitors(s){
  const guests=s.visitors.filter(onFoot);
  for(let iteration=0;iteration<18;iteration++){
    let overlap=false;
    for(let i=0;i<guests.length;i++)for(let j=i+1;j<guests.length;j++){
      const a=guests[i],b=guests[j];let dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
      if(d>=VISITOR_SPACING-.0001)continue;overlap=true;
      if(d<.00001){const angle=(i*7+j*11)*2.399963;dx=Math.cos(angle);dz=Math.sin(angle);d=1;}
      const push=(VISITOR_SPACING-Math.hypot(b.x-a.x,b.z-a.z))+.0001,nx=dx/d,nz=dz/d;
      const ax=a.x,az=a.z,bx=b.x,bz=b.z;
      const movedA=place(s,a,ax-nx*push/2,az-nz*push/2),movedB=place(s,b,bx+nx*push/2,bz+nz*push/2);
      if(!movedA&&movedB)place(s,b,bx+nx*push,bz+nz*push);
      if(!movedB&&movedA)place(s,a,ax-nx*push,az-nz*push);
      if(!movedA&&!movedB){
        // Slide along the corridor instead of pushing anybody into grass.
        for(const [sx,sz] of [[nx,0],[0,nz],[-nz,nx],[nz,-nx]]){
          if(place(s,a,ax-sx*push,az-sz*push)||place(s,b,bx+sx*push,bz+sz*push))break;
        }
      }
    }
    if(!overlap)break;
  }
}
export function moveVisitors(s,dt){
  const arrived=new Set(),before=new Map(s.visitors.map(v=>[v.id,{x:v.x,z:v.z}]));
  for(let remaining=dt;remaining>.00001;remaining-=.04){
    const step=Math.min(.04,remaining)*1.3;
    for(const v of s.visitors){
      if(!onFoot(v)||(!v.route.length&&!v.restSpot)||arrived.has(v.id))continue;
      const target=v.route.length?waypoint(s,v):v.restSpot,dx=target.x-v.x,dz=target.z-v.z,distance=Math.hypot(dx,dz);
      if(v.progressNode!==v.route[0]||distance<(v.progressDistance??Infinity)-.15){v.progressNode=v.route[0];v.progressDistance=distance;v.progressTime=s.time;}
      const clear=(x,z)=>walkable(s,x,z)&&s.visitors.every(other=>other===v||!onFoot(other)||Math.hypot(x-other.x,z-other.z)>=VISITOR_SPACING-.0001);
      if(v.route.length&&distance<(v.route.length>1?.28:.15)){
        const node=v.route.shift();delete v.crowdGoal;
        if(node.c!==undefined)v.cell={c:node.c,r:node.r};if(!v.route.length){v.restSpot=target;arrived.add(v.id);}
      }else if(distance<=step&&clear(target.x,target.z)){
        v.x=target.x;v.z=target.z;
        if(!v.route.length)delete v.restSpot;
      }else if(distance>.0001){
        for(const angle of [0,.35,-.35,.75,-.75,1.2,-1.2,Math.PI/2,-Math.PI/2]){
          const nx=(dx*Math.cos(angle)-dz*Math.sin(angle))/distance,nz=(dx*Math.sin(angle)+dz*Math.cos(angle))/distance;
          const x=v.x+nx*Math.min(distance,step),z=v.z+nz*Math.min(distance,step);
          if(clear(x,z)){v.x=x;v.z=z;v.heading=Math.atan2(nx,nz);v.crowdWait=0;break;}
        }
        v.crowdWait=(v.crowdWait??0)+Math.min(.04,remaining);
        if(v.crowdWait>2){delete v.crowdGoal;v.crowdWait=0;}
      }
    }
    separateVisitors(s);
  }
  for(const v of s.visitors){const p=before.get(v.id);v.moving=!!p&&Math.hypot(v.x-p.x,v.z-p.z)>.001;}
  return arrived;
}
