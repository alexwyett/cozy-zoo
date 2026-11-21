import { CATALOG,cellKey,normalizeRotation } from './catalog.js';
import { railAt,railPorts,RAIL_DIRECTIONS } from './railway.js';
import { buy } from './simulation.js';
import { pathNeighbors } from './bridges.js';

export const canDraw=type=>type==='path'||CATALOG[type]?.kind==='rail';
export function extendStroke(cells,next){
  const route=cells.map(p=>({...p}));if(!Number.isInteger(next.c)||!Number.isInteger(next.r))return route;
  if(!route.length)return [{...next}];
  let last=route.at(-1);
  while(last.c!==next.c||last.r!==next.r){
    const dc=next.c-last.c,dr=next.r-last.r;
    const p={c:last.c+(Math.abs(dc)>=Math.abs(dr)?Math.sign(dc):0),r:last.r+(Math.abs(dc)<Math.abs(dr)?Math.sign(dr):0)};
    const previous=route.findIndex(q=>q.c===p.c&&q.r===p.r);
    if(previous>0)route.splice(previous+1);
    else if(previous===0){if(route.length>2){route.push(p);break;}route.splice(1);}
    else if(previous<0)route.push(p);
    last=route.at(-1);if(route.length>=360)break;
  }
  return route;
}
const direction=(a,b)=>RAIL_DIRECTIONS.findIndex(d=>a.c+d.dc===b.c&&a.r+d.dr===b.r);
function outerPort(s,p,excluded){
  for(let port=0;port<4;port++){
    if(excluded.includes(port))continue;const d=RAIL_DIRECTIONS[port],neighbor=railAt(s,p.c+d.dc,p.r+d.dr);
    if(neighbor&&railPorts(neighbor).includes((port+2)%4))return port;
  }
  return null;
}
function planOrdered(s,tool,cells,rotation=0){
  const items=[],fail=reason=>({ok:false,reason,items,cost:items.reduce((sum,item)=>sum+(item.existing?0:CATALOG[item.type].price),0)});
  if(!canDraw(tool)||!cells.length)return fail('Drag a route on your land.');
  if(cells.length>360||cells.some(p=>!Number.isInteger(p.c)||!Number.isInteger(p.r)))return fail('Choose a route within your zoo.');
  const closed=cells.length>2&&cellKey(cells[0].c,cells[0].r)===cellKey(cells.at(-1).c,cells.at(-1).r),route=closed?cells.slice(0,-1):cells;
  if(new Set(route.map(p=>cellKey(p.c,p.r))).size!==route.length)return fail('A route cannot cross itself. Drag back to undo.');
  const temp={...s,coins:1e8,paths:[...s.paths],buildings:s.buildings.map(b=>({...b})),stats:{...s.stats},events:[...s.events]};
  for(let i=0;i<route.length;i++){
    const p=route[i],prev=route[i-1]??(closed?route.at(-1):null),next=route[i+1]??(closed?route[0]:null);
    if((prev&&direction(p,prev)<0)||(next&&direction(p,next)<0))return fail('Draw along neighbouring tiles.');
    let type=tool==='path'?'path':'rail-straight',turn=normalizeRotation(rotation),existing=false;
    if(tool==='path')existing=temp.paths.includes(cellKey(p.c,p.r));
    else{
      const current=railAt(temp,p.c,p.r),ports=[prev?direction(p,prev):null,next?direction(p,next):null];
      if(ports[0]===null)ports[0]=outerPort(temp,p,ports.filter(n=>n!==null));
      if(ports[1]===null)ports[1]=outerPort(temp,p,ports.filter(n=>n!==null))??(ports[0]!==null?(ports[0]+2)%4:null);
      if(ports[0]===null&&ports[1]!==null)ports[0]=(ports[1]+2)%4;
      if(ports.every(n=>n===null)){ports[0]=turn;ports[1]=(turn+2)%4;}
      if(current){
        if(!ports.every(port=>railPorts(current).includes(port))){items.push({...p,type:current.type,rotation:current.rotation,existing:true});return fail('This route does not match the existing rail ends. Start from an open end.');}
        type=current.type;turn=current.rotation;existing=true;
      }else if((ports[0]+2)%4===ports[1]){turn=ports[0]%2;type=temp.paths.includes(cellKey(p.c,p.r))?'rail-crossing':'rail-straight';}
      else{type='rail-corner';turn=[0,1,2,3].find(r=>ports.every(port=>[r,(r+3)%4].includes(port)));}
    }
    const item={...p,type,rotation:turn,existing};items.push(item);
    if(!existing){const result=buy(temp,type,p.c,p.r,turn);if(!result.ok)return fail(result.reason);if(result.bridge){item.bridge=true;item.rotation=railAt(temp,p.c,p.r).rotation;}}
  }
  if(tool==='path')for(let i=1;i<route.length;i++)if(!pathNeighbors(temp,route[i-1].c,route[i-1].r).some(p=>p.c===route[i].c&&p.r===route[i].r))return fail('Bridge ramps must run straight. Connect paths at the ramp ends.');
  const cost=temp.stats.spent-s.stats.spent,count=items.filter(item=>!item.existing).length;
  if(!count)return {...fail('This route is already built. Extend it onto an empty tile.'),cost:0};
  return {ok:s.coins>=cost,reason:s.coins>=cost?'Review your route, then press Build.':`You need $${cost-s.coins} more for this route.`,items,cost,count,temp};
}
export function planStroke(s,tool,cells,rotation=0){
  const plan=planOrdered(s,tool,cells,rotation);
  if(plan.ok||cells.length<2)return plan;
  const reverse=planOrdered(s,tool,[...cells].reverse(),rotation);return reverse.ok?reverse:plan;
}
export function buildStroke(s,tool,cells,rotation=0){
  const plan=planStroke(s,tool,cells,rotation);if(!plan.ok)return plan;
  const existing=new Map(s.buildings.map(b=>[b.id,b]));
  s.buildings=plan.temp.buildings.map(b=>existing.has(b.id)?Object.assign(existing.get(b.id),b):b);
  s.paths=plan.temp.paths;s.coins-=plan.cost;s.nextId=plan.temp.nextId;s.events=plan.temp.events;Object.assign(s.stats,plan.temp.stats);
  return plan;
}
