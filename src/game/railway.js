import { CATALOG,worldCell,normalizeRotation,TILE } from './catalog.js';

export const RAIL_FARE=8,RAIL_CAPACITY=4,RAIL_SPEED=1.6;
export const RAIL_DIRECTIONS=[{dc:0,dr:-1},{dc:1,dr:0},{dc:0,dr:1},{dc:-1,dr:0}];
export const isRail=b=>!!b&&['rail','station'].includes(CATALOG[b.type]?.kind);
export const railAt=(s,c,r)=>s.buildings.find(b=>b.c===c&&b.r===r&&isRail(b));
export function railPorts(b){const base=CATALOG[b.type]?.railShape==='corner'?[0,3]:[0,2];return base.map(p=>(p+normalizeRotation(b.rotation))%4);}
export function connectedRail(s,b,port){const d=RAIL_DIRECTIONS[port],other=railAt(s,b.c+d.dc,b.r+d.dr);return other&&railPorts(other).includes((port+2)%4)?other:null;}
export function railConnects(s,b){return railPorts(b).some(port=>connectedRail(s,b,port));}
export const occupiedTrain=s=>(s.train?.passengers?.length??0)>0;
export function railwayStatus(s,station=s.buildings.find(b=>CATALOG[b.type].kind==='station')){
  const closed=reason=>({open:false,reason,station,pieces:[]});
  if(!station)return closed('Build a railway station to begin.');
  if(station.remaining)return closed('Your station is under construction.');
  const ports=railPorts(station),pieces=[],seen=new Set([station.id]);let current=station,exit=ports[0];
  for(let i=0;i<360;i++){
    const next=connectedRail(s,current,exit);if(!next)return {...closed('Join both ends into a loop back to the station.'),pieces};
    const entry=(exit+2)%4;
    if(next.id===station.id){if(entry!==ports[1]||pieces.length<3)return closed('Make a complete loop with space for the train.');return {open:true,reason:'Loop complete. All aboard!',station,pieces};}
    if(seen.has(next.id)||next.remaining)return closed('Finish connecting the track to your station.');seen.add(next.id);
    exit=railPorts(next).find(p=>p!==entry);pieces.push({building:next,entry,exit});current=next;
  }
  return closed('Check the track connections.');
}
function rotatePoint(x,z,rotation){const a=normalizeRotation(rotation)*Math.PI/2;return {x:x*Math.cos(a)-z*Math.sin(a),z:x*Math.sin(a)+z*Math.cos(a)};}
export function segmentPoints(b,entry){
  const center=worldCell(b.c,b.r),ports=railPorts(b);let points=[];
  if(CATALOG[b.type].railShape==='corner'){
    for(let i=0;i<=16;i++){const angle=i/16*Math.PI/2,p=rotatePoint(-1+Math.cos(angle),-1+Math.sin(angle),b.rotation);points.push({x:center.x+p.x,z:center.z+p.z});}
    if(entry!==ports[0])points.reverse();
  }else for(const port of [entry,ports.find(p=>p!==entry)]){const d=RAIL_DIRECTIONS[port];points.push({x:center.x+d.dc*TILE/2,z:center.z+d.dr*TILE/2});}
  return points;
}
export function buildRailRoute(status){
  if(!status.open)return null;
  const station=status.station,center=worldCell(station.c,station.r),d=RAIL_DIRECTIONS[railPorts(station)[0]],points=[{x:center.x,z:center.z},{x:center.x+d.dc,z:center.z+d.dr}];
  for(const {building,entry} of status.pieces)points.push(...segmentPoints(building,entry).slice(1));
  points.push({x:center.x,z:center.z});let length=0;const distances=[0];
  for(let i=1;i<points.length;i++){length+=Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z);distances.push(length);}
  return {points,distances,length};
}
export function pointOnRail(route,distance){
  const at=((distance%route.length)+route.length)%route.length;let i=1;while(i<route.distances.length-1&&route.distances[i]<at)i++;
  const a=route.points[i-1],b=route.points[i],span=route.distances[i]-route.distances[i-1],t=span?(at-route.distances[i-1])/span:0;
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,heading:Math.atan2(b.x-a.x,b.z-a.z)};
}
export const railLayoutKey=s=>s.buildings.filter(isRail).map(b=>`${b.id}:${b.type}:${b.c},${b.r}:${b.rotation??0}:${b.remaining>0}`).join(';');
