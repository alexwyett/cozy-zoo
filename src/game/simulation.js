import { CATALOG,COLS,ROWS,GATE,ADMISSION,VISITOR_KEYS,ROAD,cellKey,worldCell,normalizeRotation } from './catalog.js';
import { ownsCell,restoreLand } from './land.js';
import { isRail,railConnects,railwayStatus,railLayoutKey,buildRailRoute,occupiedTrain,RAIL_FARE,RAIL_CAPACITY,RAIL_SPEED } from './railway.js';
import { isBridge,bridgeAt,bridgeCells,pathNeighbors,bridgeOccupied,withBridge } from './bridges.js';
import { moveVisitors,separateVisitors } from './crowd.js';
import { ensureResidents,cleanAnimalName,cleanAnimalColour,needsCare } from './residents.js';

const clamp=(v,a=0,b=100)=>Math.min(b,Math.max(a,v));
const finite=(v,fallback)=>Number.isFinite(v)?v:fallback;
export function createGame(){
  const paths=[];
  for(let r=5;r<ROWS;r++)for(const c of [5,6])paths.push(cellKey(c,r));
  for(const r of [5,8])for(let c=1;c<=10;c++)if(!paths.includes(cellKey(c,r)))paths.push(cellKey(c,r));
  const state={version:1,coins:1800,time:0,day:1,seed:5821,nextId:2,land:[],paths,buildings:[{id:'b1',type:'penguin',c:2,r:6,rotation:0,level:1,food:37,clean:48,remaining:0}],visitors:[],vehicles:[],nextArrival:1.5,events:[],stats:{admissions:0,departures:0,sales:0,rides:0,income:0,spent:0,refunds:0,care:0,built:0},paused:false};
  ensureResidents(state.buildings[0]);return state;
}
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function uid(s,prefix){return prefix+s.nextId++;}
export const buildingAt=(s,c,r)=>s.buildings.find(b=>c>=b.c&&c<b.c+CATALOG[b.type].w&&r>=b.r&&r<b.r+CATALOG[b.type].h);
export function connectedPaths(s){
  const paths=new Set(s.paths),seen=new Set(),todo=[GATE];
  for(let i=0;i<todo.length;i++){
    const p=todo[i],key=cellKey(p.c,p.r);if(seen.has(key)||!paths.has(key))continue;seen.add(key);todo.push(...pathNeighbors(s,p.c,p.r));
  }
  return seen;
}
export function approaches(s,b,connected=connectedPaths(s)){
  const spec=CATALOG[b.type],points=[];
  for(let c=b.c;c<b.c+spec.w;c++)for(const r of [b.r-1,b.r+spec.h])if(connected.has(cellKey(c,r))&&!bridgeAt(s,c,r))points.push({c,r});
  for(let r=b.r;r<b.r+spec.h;r++)for(const c of [b.c-1,b.c+spec.w])if(connected.has(cellKey(c,r))&&!bridgeAt(s,c,r))points.push({c,r});
  return points;
}
function bridgePlacement(s,b){
  for(const p of bridgeCells(b)){
    if(!ownsCell(s,p.c,p.r))return {ok:false,reason:'Buy the land for both bridge ramps first.'};
    if(p.r===GATE.r&&(p.c===GATE.c||p.c===GATE.c+1))return {ok:false,reason:'Keep the entrance paths level and clear.'};
    const other=buildingAt(s,p.c,p.r),bridge=bridgeAt(s,p.c,p.r);
    if((other&&other.id!==b.id)||(bridge&&bridge.id!==b.id))return {ok:false,reason:'Leave one clear tile on each side of the track for bridge ramps.'};
  }
  if(bridgeOccupied(s,b))return {ok:false,reason:'Wait for guests to clear the bridge area before building or turning it.'};
  const next=withBridge(s,b),before=connectedPaths(s),after=connectedPaths(next);
  if(!after.has(cellKey(b.c,b.r)))return {ok:false,reason:'Connect a path to a ramp end, across the track. Try Rotate.'};
  for(const item of s.buildings)if(item.id!==b.id&&!['rail','tree','bench'].includes(CATALOG[item.type].kind)&&approaches(s,item,before).length&&!approaches(next,item,after).length)return {ok:false,reason:`Keep a level path to ${CATALOG[item.type].name}; bridge ramps cannot serve buildings.`};
  for(const v of s.visitors){
    if(!v.admitted||['toCar','waiting','riding'].includes(v.stage))continue;
    if(!after.has(cellKey(v.cell.c,v.cell.r))||v.route.some(p=>p.c!==undefined&&!after.has(cellKey(p.c,p.r))))return {ok:false,reason:'Keep the routes guests are using open. Add a level path around the bridge first.'};
    let previous=v.cell;
    for(const p of v.route.filter(p=>p.c!==undefined)){
      if((p.c!==previous.c||p.r!==previous.r)&&!pathNeighbors(next,previous.c,previous.r).some(q=>q.c===p.c&&q.r===p.r))return {ok:false,reason:'A guest is using a side approach. Wait until they pass before building the bridge.'};
      previous=p;
    }
  }
  return {ok:true,bridge:b,next};
}
export function canPlace(s,type,c,r,rotation=0){
  const spec=Object.hasOwn(CATALOG,type)?CATALOG[type]:null;if(!spec)return {ok:false,reason:'Choose something from the shop.'};
  if(!Number.isInteger(c)||!Number.isInteger(r)||!ownsCell(s,c,r)||!ownsCell(s,c+spec.w-1,r+spec.h-1))return {ok:false,reason:'Buy this land from the Land tab before building here.'};
  const existing=buildingAt(s,c,r),overRail=type==='path'&&existing?.type==='rail-straight';
  for(let x=c;x<c+spec.w;x++)for(let y=r;y<r+spec.h;y++){
    if(!ownsCell(s,x,y))return {ok:false,reason:'Buy all the land beneath this building first.'};
    if((buildingAt(s,x,y)&&!overRail)||(s.paths.includes(cellKey(x,y))&&!spec.crossing))return {ok:false,reason:'That space is already in use.'};
  }
  if(spec.crossing&&!s.paths.includes(cellKey(c,r)))return {ok:false,reason:'Place a crossing over an existing footpath.'};
  if((['rail','station'].includes(spec.kind)||overRail)&&occupiedTrain(s))return {ok:false,reason:'Wait for the passengers to return before editing the railway.'};
  if(spec.kind==='station'&&s.buildings.some(b=>CATALOG[b.type].kind==='station'))return {ok:false,reason:'Your zoo already has a railway station.'};
  let bridge=null;
  if(spec.crossing||overRail){bridge=bridgePlacement(s,overRail?{...existing,type:'rail-crossing'}:{id:'preview-bridge',type,c,r,rotation});if(!bridge.ok)return bridge;}
  const connected=connectedPaths(s);
  const access=spec.kind==='rail'?railConnects(s,{type,c,r,rotation}):spec.kind==='path'?(bridge?.ok||pathNeighbors(s,c,r).some(p=>connected.has(cellKey(p.c,p.r)))):approaches(s,{type,c,r},connected).length>0;
  if(!access)return {ok:false,reason:spec.kind==='rail'?'Join a rail end to the station or another track. Try Rotate.':'Place it beside a path connected to the entrance.'};
  if(s.coins<spec.price)return {ok:false,reason:`You need $${spec.price-s.coins} more.`};
  return {ok:true,bridge:bridge?.bridge,reason:bridge?'A footbridge with two ramps. Includes any missing ramp paths.':spec.kind==='path'?'A new path for your guests.':'Ready to build here.'};
}
export function buy(s,type,c,r,rotation=0){
  if(!Number.isInteger(rotation))return {ok:false,reason:'Choose a quarter-turn orientation.'};
  const result=canPlace(s,type,c,r,rotation);if(!result.ok)return result;
  const spec=CATALOG[type];s.coins-=spec.price;s.stats.spent+=spec.price;
  if(spec.kind==='path'){
    if(result.bridge){const rail=buildingAt(s,c,r);rail.type='rail-crossing';s.paths=withBridge(s,rail).paths;}
    else s.paths.push(cellKey(c,r));
    s.events.push({kind:'build',type,c,r});return {ok:true,path:true,bridge:!!result.bridge};
  }
  const b=ensureResidents({id:uid(s,'b'),type,c,r,rotation:normalizeRotation(rotation),level:1,food:100,clean:100,remaining:spec.buildTime});s.buildings.push(b);s.stats.built++;
  if(isBridge(b))s.paths=withBridge(s,b).paths;
  s.events.push({kind:'purchase',id:b.id,type,c,r});return {ok:true,building:b};
}
export function rotate(s,id){
  const b=s.buildings.find(b=>b.id===id);if(!b)return {ok:false,reason:'Choose an object in your zoo.'};
  if(isRail(b)&&occupiedTrain(s))return {ok:false,reason:'Wait for the passengers to return before editing the railway.'};
  if(isBridge(b)){
    if(bridgeOccupied(s,b))return {ok:false,reason:'Wait for guests to leave the bridge before turning it.'};
    const next={...b,rotation:normalizeRotation(b.rotation+1)},result=bridgePlacement(s,next);if(!result.ok)return result;s.paths=result.next.paths;
  }
  b.rotation=normalizeRotation(normalizeRotation(b.rotation)+1);
  return {ok:true,rotation:b.rotation};
}
export function toggleRailway(s,id){
  const station=s.buildings.find(b=>b.id===id&&CATALOG[b.type].kind==='station');
  if(!station)return {ok:false,reason:'Choose your railway station.'};
  station.closed=!station.closed;return {ok:true,closed:station.closed};
}
export function canRemove(s,c,r){
  if(!Number.isInteger(c)||!Number.isInteger(r)||!ownsCell(s,c,r))return {ok:false,reason:'Choose a path or facility inside your zoo.'};
  const building=buildingAt(s,c,r),path=s.paths.includes(cellKey(c,r));
  if(!building&&!path)return {ok:false,reason:'Tap a path or facility to remove it.'};
  if(building&&CATALOG[building.type].kind==='pen')return {ok:false,reason:'Animal homes stay in place. Choose a path or visitor facility.'};
  if(building&&isRail(building)&&occupiedTrain(s))return {ok:false,reason:'Wait for the passengers to return before editing the railway.'};
  if(building&&isBridge(building)&&bridgeOccupied(s,building))return {ok:false,reason:'Wait for guests to leave the bridge before removing it.'};
  if(path&&!building){
    if(bridgeAt(s,c,r))return {ok:false,reason:'Remove the bridge before digging up its ramp paths.'};
    if(r===GATE.r&&(c===GATE.c||c===GATE.c+1))return {ok:false,reason:'Keep the entrance paths open.'};
    const before=connectedPaths(s),after=connectedPaths({...s,paths:s.paths.filter(key=>key!==cellKey(c,r))});
    for(const b of s.buildings)if(!['tree','bench'].includes(b.type)&&CATALOG[b.type].kind!=='rail'&&approaches(s,b,before).length&&!approaches(s,b,after).length)return {ok:false,reason:`Add another route to ${CATALOG[b.type].name} first.`};
    for(const v of s.visitors){
      if(!v.admitted||['toCar','waiting'].includes(v.stage))continue;
      const next=v.route[0];
      if(!after.has(cellKey(v.cell.c,v.cell.r))||(next?.c!==undefined&&!after.has(cellKey(next.c,next.r))))return {ok:false,reason:'A guest needs this path. Wait or add another route.'};
    }
  }
  const type=building?building.type:'path',refund=Math.floor(CATALOG[type].price/2);
  return {ok:true,type,building,refund,reason:`Remove ${CATALOG[type].name.toLowerCase()}? Recover $${refund} (half the base price).`};
}
export function remove(s,c,r){
  const result=canRemove(s,c,r);if(!result.ok)return result;
  if(result.building)s.buildings=s.buildings.filter(b=>b.id!==result.building.id);
  else s.paths=s.paths.filter(key=>key!==cellKey(c,r));
  s.coins+=result.refund;s.stats.refunds=(s.stats.refunds??0)+result.refund;
  for(const v of s.visitors){
    if(!v.admitted||['toCar','waiting'].includes(v.stage))continue;
    if(result.type!=='path'&&v.target!==result.building?.id)continue;
    const wasLeaving=v.stage==='leaving';v.target=null;v.need=null;v.route=[];v.wait=0;
    if(wasLeaving)leave(s,v);else planVisitor(s,v);
    // Return along the current segment before following the newly calculated route.
    const center=worldCell(v.cell.c,v.cell.r);
    if(v.route.length&&Math.hypot(v.x-center.x,v.z-center.z)>.01)v.route.unshift(center);
  }
  s.events.push({kind:'removed',type:result.type,id:result.building?.id,c,r,refund:result.refund});
  return result;
}
export function care(s,id,action){
  const b=s.buildings.find(b=>b.id===id);if(!b||CATALOG[b.type].kind!=='pen'||b.remaining>0)return {ok:false,reason:'This pen is not ready yet.'};
  if(action==='feed'){
    if(b.food>98)return {ok:false,reason:'There is plenty of food already.'};
    const cost=CATALOG[b.type].feedCost;if(s.coins<cost)return {ok:false,reason:`Food costs $${cost}.`};s.coins-=cost;s.stats.spent+=cost;b.food=100;
  }else if(action==='clean'){
    if(b.clean>98)return {ok:false,reason:'This pen is already sparkling.'};b.clean=100;
  }else return {ok:false,reason:'Unknown care action.'};
  s.stats.care++;s.events.push({kind:'care',id,action});return {ok:true};
}
export const upgradePrice=b=>Math.max(80,Math.round(CATALOG[b.type].price*0.45*b.level));
export function renameAnimal(s,id,animalId,name){
  const b=s.buildings.find(b=>b.id===id),value=cleanAnimalName(name);
  if(!b||CATALOG[b.type].kind!=='pen')return {ok:false,reason:'Choose an animal pen.'};
  if(!value)return {ok:false,reason:'Give your animal a name.'};
  ensureResidents(b);const animal=b.animals.find(a=>a.id===animalId);
  if(!animal)return {ok:false,reason:'This animal is not in the pen.'};
  animal.name=value;return {ok:true,name:value};
}
export function colourAnimal(s,id,animalId,color){
  const b=s.buildings.find(b=>b.id===id),value=cleanAnimalColour(color);
  if(!b||CATALOG[b.type].kind!=='pen')return {ok:false,reason:'Choose an animal pen.'};
  if(color!==null&&color!==''&&!value)return {ok:false,reason:'Choose a valid coat colour.'};
  ensureResidents(b);const animal=b.animals.find(a=>a.id===animalId);
  if(!animal)return {ok:false,reason:'This animal is not in the pen.'};
  animal.color=value;return {ok:true,color:value};
}
export function upgrade(s,id){
  const b=s.buildings.find(b=>b.id===id);if(!b||b.remaining>0||b.level>=3||['tree','bench'].includes(b.type)||isRail(b))return {ok:false,reason:'No upgrade available.'};
  const price=upgradePrice(b);if(s.coins<price)return {ok:false,reason:`You need $${price-s.coins} more.`};
  s.coins-=price;s.stats.spent+=price;b.level++;b.remaining=6;s.events.push({kind:'purchase',id:b.id,type:b.type,c:b.c,r:b.r});return {ok:true};
}
export const welfare=b=>Math.round((b.food+b.clean)/2);
export function summary(s){
  const guests=s.visitors.filter(v=>!['toGate','waiting'].includes(v.stage));
  const pens=s.buildings.filter(b=>CATALOG[b.type].kind==='pen'&&!b.remaining);
  return {guests:guests.length,happiness:guests.length?Math.round(guests.reduce((n,v)=>n+v.happiness,0)/guests.length):100,welfare:pens.length?Math.round(pens.reduce((n,b)=>n+welfare(b),0)/pens.length):100,pens:pens.length,alerts:pens.filter(b=>b.food<=35||b.clean<=40).length,hungry:guests.filter(v=>v.hunger>=60).length,thirsty:guests.filter(v=>v.thirst>=60).length,toilet:guests.filter(v=>v.bladder>=60).length};
}
function findRoute(s,start,target){
    const paths=new Set(s.paths),todo=[start],previous=new Map([[cellKey(start.c,start.r),null]]),goal=cellKey(target.c,target.r);
  for(let i=0;i<todo.length;i++){
    const p=todo[i],key=cellKey(p.c,p.r);if(key===goal){
      const route=[];let at=key;while(at){const [c,r]=at.split(',').map(Number);route.unshift(worldCell(c,r));at=previous.get(at);}return route.slice(1);
    }
    for(const q of pathNeighbors(s,p.c,p.r)){const k=cellKey(q.c,q.r);if(paths.has(k)&&!previous.has(k)){previous.set(k,key);todo.push(q);}}
  }
  return null;
}
function navigate(s,v,target,stage){
  const route=findRoute(s,v.cell??GATE,target);if(route===null)return false;v.route=route;v.stage=stage;delete v.crowdGoal;delete v.restSpot;return true;
}
function nearestApproach(s,v,b,connected){return approaches(s,b,connected).sort((a,b)=>Math.abs(a.c-v.cell.c)+Math.abs(a.r-v.cell.r)-Math.abs(b.c-v.cell.c)-Math.abs(b.r-v.cell.r))[0];}
function leave(s,v){v.target=null;v.need=null;return navigate(s,v,GATE,'leaving');}
function planVisitor(s,v){
  const connected=connectedPaths(s),open=s.buildings.filter(b=>!b.remaining&&approaches(s,b,connected).length);
  if(v.age>v.stay||v.happiness<22){leave(s,v);return;}
  const needs=[['hunger','food'],['thirst','drink'],['bladder','toilet']].sort((a,b)=>v[b[0]]-v[a[0]]);
  for(const [need,kind] of needs){
    if(v[need]<58)continue;
    const options=open.filter(b=>CATALOG[b.type].kind===kind&&v.wallet>=CATALOG[b.type].revenue);
    if(options.length){const b=options[Math.floor(random(s)*options.length)];v.target=b.id;v.need=need;navigate(s,v,nearestApproach(s,v,b,connected),'toService');return;}
  }
  const station=open.find(b=>CATALOG[b.type].kind==='station');
  if(station&&!station.closed&&v.visits>=1&&!v.rides&&v.wallet>=RAIL_FARE&&railwayStatus(s,station).open){v.target=station.id;v.need=null;navigate(s,v,nearestApproach(s,v,station,connected),'toRail');return;}
  const gift=open.find(b=>b.type==='gift');
  if(gift&&!v.gift&&v.visits>=1&&v.wallet>=12){v.target=gift.id;v.need='gift';navigate(s,v,nearestApproach(s,v,gift,connected),'toService');return;}
  const pens=open.filter(b=>CATALOG[b.type].kind==='pen');
  if(pens.length){const b=pens[Math.floor(random(s)*pens.length)];v.target=b.id;v.need=null;navigate(s,v,nearestApproach(s,v,b,connected),'toPen');return;}
  v.stage='resting';v.wait=5;
}
function earn(s,amount,event){s.coins+=amount;s.stats.income+=amount;s.events.push({kind:'income',amount,...event});}
function arrive(s,v){
  if(v.stage==='toGate'){
    v.cell={...GATE};v.stage='resting';v.age=0;v.wait=0;v.admitted=true;s.stats.admissions++;earn(s,ADMISSION,{source:'gate',x:-0.5,z:9.4});planVisitor(s,v);
  }else if(v.stage==='leaving'){
    v.stage='toCar';v.route=[{x:0,z:10.8},{x:0,z:11.6}];s.stats.departures++;
  }else if(v.stage==='toCar'){v.stage='waiting';v.route=[];}
  else if(v.stage==='toPen'){
    const b=s.buildings.find(b=>b.id===v.target);v.stage='watching';v.wait=7+random(s)*7;v.visits++;
    if(b){
      if(needsCare(b)){v.happiness=clamp(v.happiness-5-(100-welfare(b))/12);v.welfareConcern={penId:b.id,until:s.time+12};}
      else v.happiness=clamp(v.happiness+(welfare(b)-50)/12+2+(b.level-1)*2);
    }
  }else if(v.stage==='toRail'){
    const status=railwayStatus(s);if(status.open&&!status.station.closed){v.stage='railQueue';v.route=[];}else planVisitor(s,v);
  }else if(v.stage==='toService'){
    const b=s.buildings.find(b=>b.id===v.target);v.stage='serving';v.wait=2.5;
    if(!b||b.remaining){v.stage='resting';v.wait=1;}
  }
}
function spawnGuest(s,vehicle){
  const offset=random(s)*0.5;
  s.visitors.push({id:uid(s,'v'),stage:'toGate',x:offset,z:11.9,cell:{...GATE},route:[{x:0,z:10.8},worldCell(GATE.c,GATE.r)],target:null,wait:0,age:0,stay:95+random(s)*75,visits:0,hunger:35+random(s)*27,thirst:33+random(s)*30,bladder:20+random(s)*27,happiness:95,wallet:65+Math.floor(random(s)*25),gift:false,admitted:false,color:Math.floor(random(s)*VISITOR_KEYS.length),vehicle:vehicle.id});
}
function tickVehicles(s,dt){
  s.nextArrival-=dt;
  if(s.nextArrival<=0){
    const bus=s.stats.admissions>3&&random(s)>0.50;
    s.vehicles.push({id:uid(s,'car'),kind:bus?'bus':'car',x:ROAD.spawnX,z:ROAD.z,stage:'arriving',wait:0,capacity:bus?6:3,incoming:s.visitors.length<30?(bus?5:2):0,color:Math.floor(random(s)*4)});
    s.nextArrival=17+random(s)*7;
  }
  for(const car of s.vehicles){
    if(car.stage==='arriving'){
      car.x=Math.min(0,car.x+dt*ROAD.speed);
      if(car.x===0){car.stage='stopped';car.wait=4;s.events.push({kind:'arrival',bus:car.kind==='bus'});for(let i=0;i<car.incoming;i++)spawnGuest(s,car);}
    }else if(car.stage==='stopped'){
      const board=s.visitors.filter(v=>v.stage==='waiting').slice(0,car.capacity);for(const v of board)s.visitors.splice(s.visitors.indexOf(v),1);
      car.wait-=dt;if(car.wait<=0)car.stage='departing';
    }else car.x+=dt*ROAD.speed;
  }
  s.vehicles=s.vehicles.filter(car=>car.x<ROAD.exitX);
}
export function tick(s,dt){
  if(s.paused||!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(dt,0.25);s.time+=dt;s.day=1+Math.floor(s.time/300);tickVehicles(s,dt);
  for(const b of s.buildings){
    if(b.remaining>0){b.remaining=Math.max(0,b.remaining-dt);if(b.remaining===0){ensureResidents(b);s.events.push({kind:'complete',id:b.id,type:b.type});}continue;}
    if(CATALOG[b.type].kind==='pen'){const efficiency=1-(b.level-1)*0.12;b.food=clamp(b.food-dt*0.19*efficiency);b.clean=clamp(b.clean-dt*0.14*efficiency);}
  }
  const arrived=moveVisitors(s,dt);
  for(const v of s.visitors){
    if(['waiting','toCar'].includes(v.stage)){}
    else if(v.admitted){
      v.age+=dt;v.hunger=clamp(v.hunger+dt*0.30);v.thirst=clamp(v.thirst+dt*0.38);v.bladder=clamp(v.bladder+dt*0.22);
      const strain=Math.max(0,v.hunger-65)+Math.max(0,v.thirst-65)+Math.max(0,v.bladder-65);
      v.happiness=clamp(v.happiness-dt*strain*0.013);
      if(v.stage==='watching'){
        const pen=s.buildings.find(b=>b.id===v.target);
        if(pen&&needsCare(pen)){v.happiness=clamp(v.happiness-dt*.22);v.welfareConcern={penId:pen.id,until:s.time+12};}
      }
      if(!['leaving','toCar','riding'].includes(v.stage)&&(v.age>v.stay||(v.route.length&&s.time-(v.progressTime??s.time)>12))){leave(s,v);}
    }
    if(arrived.has(v.id)){arrive(s,v);}
    else if(v.route.length){}
    else if(['toGate','leaving','toPen','toService','toCar','toRail'].includes(v.stage)){arrive(s,v);}
    else if(v.stage==='serving'){
      v.wait-=dt;if(v.wait<=0){
        const b=s.buildings.find(b=>b.id===v.target);
        if(b&&!b.remaining){
          const spec=CATALOG[b.type],price=Math.round(spec.revenue*(1+(b.level-1)*0.15));
          if(v.wallet>=price){v.wallet-=price;if(price){s.stats.sales++;const p=worldCell(b.c,b.r);earn(s,price,{source:b.type,id:b.id,...p});}if(v.need==='gift')v.gift=true;else if(['hunger','thirst','bladder'].includes(v.need))v[v.need]=8;v.happiness=clamp(v.happiness+7);}
        }
        planVisitor(s,v);
      }
    }else if(['watching','resting'].includes(v.stage)){v.wait-=dt;if(v.wait<=0)planVisitor(s,v);}
  }
  tickRailway(s,dt);
  separateVisitors(s);
}
function tickRailway(s,dt){
  s.train??={phase:'boarding',distance:0,wait:4,passengers:[]};const key=railLayoutKey(s);
  if(s._railway?.key!==key){const status=railwayStatus(s);s._railway={key,route:buildRailRoute(status),stationId:status.station?.id};s.train.distance=0;s.train.phase='boarding';s.train.wait=4;}
  const route=s._railway.route,station=s.buildings.find(b=>b.id===s._railway.stationId);
  if(station?.closed){for(const v of s.visitors)if(v.stage==='railQueue')planVisitor(s,v);if(s.train.phase==='boarding'&&!occupiedTrain(s)){s.train.wait=4;return;}}
  if(!route){for(const v of s.visitors)if(v.stage==='railQueue')planVisitor(s,v);return;}
  for(const v of s.visitors)if(v.stage==='railQueue'&&(v.age>v.stay||v.happiness<22))leave(s,v);
  if(s.train.phase==='boarding'){
    for(const v of s.visitors.filter(v=>v.stage==='railQueue'&&!station.closed)){
      if(s.train.passengers.length>=RAIL_CAPACITY)break;
      if(v.wallet<RAIL_FARE){planVisitor(s,v);continue;}
      v.wallet-=RAIL_FARE;v.rides=(v.rides??0)+1;v.stage='riding';v.route=[];s.train.passengers.push(v.id);s.stats.rides=(s.stats.rides??0)+1;s.stats.sales++;earn(s,RAIL_FARE,{source:'railway',id:station.id,...worldCell(station.c,station.r)});
    }
    s.train.wait-=dt;if(s.train.wait<=0){s.train.phase='moving';s.train.distance=0;}
  }else{
    s.train.distance+=dt*RAIL_SPEED;if(s.train.distance>=route.length){
      for(const id of s.train.passengers){const v=s.visitors.find(v=>v.id===id);if(v){v.happiness=clamp(v.happiness+12);v.target=null;v.need=null;v.stage='resting';v.wait=0;planVisitor(s,v);}}
      s.train.passengers=[];s.train.phase='boarding';s.train.distance=0;s.train.wait=5;
    }
  }
}
export function drainEvents(s){const events=s.events;s.events=[];return events;}
export function serialize(s){
  return JSON.stringify({version:1,coins:s.coins,time:s.time,seed:s.seed,nextId:s.nextId,land:s.land??[],paths:s.paths,buildings:s.buildings,stats:s.stats});
}
export function restore(raw){
  try{
    const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.buildings)||!Array.isArray(data.paths)||data.buildings.length>360)return null;
    const land=restoreLand(data.land);if(land===null)return null;
    const state=createGame();state.land=land;state.coins=clamp(finite(data.coins,1800),0,1e8);state.time=clamp(finite(data.time,0),0,1e9);state.seed=finite(data.seed,5821)>>>0;state.nextId=Math.max(100,Math.floor(finite(data.nextId,100)));state.buildings=[];state.paths=[];
    for(const key of data.paths){if(typeof key!=='string')return null;const [c,r]=key.split(',').map(Number);if(!Number.isInteger(c)||!Number.isInteger(r)||!ownsCell(state,c,r))return null;if(!state.paths.includes(key))state.paths.push(key);}
    if(!state.paths.includes(cellKey(GATE.c,GATE.r)))return null;
    const ids=new Set();
    for(const b of data.buildings){
      const spec=Object.hasOwn(CATALOG,b.type)?CATALOG[b.type]:null;if(!spec||spec.kind==='path'||typeof b.id!=='string'||ids.has(b.id)||b.id.length>30||!Number.isInteger(b.c)||!Number.isInteger(b.r)||!ownsCell(state,b.c,b.r)||!ownsCell(state,b.c+spec.w-1,b.r+spec.h-1))return null;
      for(let c=b.c;c<b.c+spec.w;c++)for(let r=b.r;r<b.r+spec.h;r++)if(!ownsCell(state,c,r)||buildingAt(state,c,r)||(state.paths.includes(cellKey(c,r))&&!spec.crossing))return null;
      if(spec.crossing&&!state.paths.includes(cellKey(b.c,b.r)))return null;
      if(spec.kind==='station'&&state.buildings.some(item=>CATALOG[item.type].kind==='station'))return null;
      const restored={id:b.id,type:b.type,c:b.c,r:b.r,rotation:normalizeRotation(b.rotation),level:clamp(Math.floor(finite(b.level,1)),1,3),food:clamp(finite(b.food,100)),clean:clamp(finite(b.clean,100)),remaining:clamp(finite(b.remaining,0),0,30)};
      if(spec.kind==='pen'){restored.animals=Array.isArray(b.animals)?b.animals:[];ensureResidents(restored);}
      if(spec.kind==='station'&&b.closed===true)restored.closed=true;
      ids.add(b.id);state.buildings.push(restored);
    }
    // Older saves used level crossings. Upgrade those with room for ramps;
    // preserve cramped crossings at ground level rather than losing a park.
    const crossings=state.buildings.filter(b=>b.type==='rail-crossing');
    for(const b of crossings)b.levelCrossing=true;
    for(const b of crossings){
      const candidate={...b};delete candidate.levelCrossing;
      const result=bridgePlacement(state,candidate);
      if(result.ok){delete b.levelCrossing;state.paths=result.next.paths;}
    }
    for(const key of Object.keys(state.stats))state.stats[key]=clamp(finite(data.stats?.[key],0),0,1e9);
    return state;
  }catch{return null;}
}
