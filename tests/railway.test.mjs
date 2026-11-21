import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame,buy,canPlace,rotate,toggleRailway,remove,canRemove,serialize,restore,tick,drainEvents } from '../src/game/simulation.js';
import { railPorts,connectedRail,railwayStatus,buildRailRoute,pointOnRail,segmentPoints,RAIL_FARE } from '../src/game/railway.js';
import { worldCell } from '../src/game/catalog.js';
import { railwayFixture } from '../scripts/railway-fixture.mjs';
import { sceneFixture } from '../scripts/scene-fixture.mjs';
import { startupAssetKeys,buildingAssetKeys } from '../src/game/asset-plan.js';

test('rails join matching ends in every rotation; crossings preserve paths and saves',()=>{
  for(let rotation=0;rotation<4;rotation++){
    assert.deepEqual(railPorts({type:'rail-corner',rotation}),[rotation,(rotation+3)%4]);
    const points=segmentPoints({type:'rail-corner',c:0,r:0,rotation},rotation),p=worldCell(0,0);
    assert.ok(Math.abs(Math.hypot(points[0].x-p.x,points[0].z-p.z)-1)<1e-6);
    assert.equal(points.length,17);
  }
  const s=createGame();s.coins=10000;
  assert.equal(buy(s,'station',10,7,1).ok,true);
  assert.equal(buy(s,'station',8,7).ok,false,'only one station');
  assert.equal(canPlace(s,'rail-straight',11,7,0).ok,false,'side touching is not a connection');
  assert.equal(canPlace(s,'rail-straight',11,7,1).ok,true);
  assert.equal(canPlace(s,'rail-crossing',11,7,1).ok,false,'crossings need footpaths');
  assert.equal(buy(s,'rail-corner',11,7,0).ok,true);
  assert.equal(buy(s,'rail-straight',11,6,0).ok,true);
  assert.equal(buy(s,'rail-straight',11,5,0).ok,true);
  assert.equal(canPlace(s,'rail-straight',11,10,0).ok,false,'unowned land');
  const loop=railwayFixture(),crossing=loop.buildings.find(b=>b.type==='rail-crossing');
  assert.equal(railwayStatus(restore(serialize(loop))).open,true);
  const coins=loop.coins;assert.equal(remove(loop,crossing.c,crossing.r).ok,true);
  assert.ok(loop.paths.includes('9,5'));assert.equal(loop.coins,coins+22);assert.equal(railwayStatus(loop).open,false);
  assert.ok(restore(serialize(loop)));assert.equal(railwayStatus(createGame()).open,false);
});

test('a closed loop yields a continuous route along the actual curved rail centres',()=>{
  const s=railwayFixture(),status=railwayStatus(s);assert.equal(status.open,true);
  const route=buildRailRoute(status);assert.ok(route.length>15&&route.length<20);
  assert.deepEqual(route.points[0],route.points.at(-1));
  for(const b of s.buildings.filter(b=>b.type.startsWith('rail-')))for(const port of railPorts(b))assert.ok(connectedRail(s,b,port));
  for(let distance=0;distance<route.length;distance+=.05){
    const a=pointOnRail(route,distance),b=pointOnRail(route,distance+.05);
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<=.050001,'no jumps between pieces');
    assert.ok(Number.isFinite(a.heading));
  }
  assert.deepEqual(pointOnRail(route,-1),pointOnRail(route,route.length-1));
  const corner=s.buildings.find(b=>b.type==='rail-corner');rotate(s,corner.id);
  assert.equal(railwayStatus(s).open,false);assert.equal(buildRailRoute(railwayStatus(s)),null);
});

test('guests board, pay once, complete a lap and unlock editing; pause stops the train',()=>{
  const s=railwayFixture(),station=s.buildings.find(b=>b.type==='station');s.nextArrival=10000;s.visitors=[];s.events=[];
  for(let i=0;i<5;i++){const p=worldCell(10,8);s.visitors.push({id:'vtest'+i,admitted:true,stage:'railQueue',cell:{c:10,r:8},x:p.x,z:p.z,route:[],target:station.id,age:10,stay:1000,visits:1,hunger:10,thirst:10,bladder:10,happiness:70,wallet:50});}
  const coins=s.coins;tick(s,.1);
  assert.equal(s.train.passengers.length,4);assert.equal(s.stats.rides,4);assert.equal(s.coins,coins+4*RAIL_FARE);
  assert.equal(s.visitors[0].wallet,42);assert.equal(s.visitors[4].stage,'railQueue');
  assert.equal(drainEvents(s).filter(e=>e.source==='railway'&&e.kind==='income').length,4);
  const rail=s.buildings.find(b=>b.type==='rail-corner');assert.equal(canRemove(s,rail.c,rail.r).ok,false);assert.equal(rotate(s,rail.id).ok,false);
  assert.equal(canPlace(s,'rail-straight',11,8,0).ok,false);
  for(let i=0;i<45;i++)tick(s,.1);assert.equal(s.train.phase,'moving');
  const distance=s.train.distance;s.paused=true;tick(s,.2);assert.equal(s.train.distance,distance);s.paused=false;
  s.visitors[4].age=1001;
  for(let i=0;i<150&&s.train.passengers.length;i++)tick(s,.1);
  assert.equal(s.train.passengers.length,0);assert.equal(s.train.phase,'boarding');assert.equal(s.stats.rides,4);
  assert.ok(s.visitors.slice(0,4).every(v=>v.stage!=='riding'&&v.happiness>=81));assert.equal(canRemove(s,rail.c,rail.r).ok,true);
});

test('actual railway models keep their colours, align to a route and move without duplicating on sync',async()=>{
  const world=await sceneFixture(),s=railwayFixture();world.sync(s);world.update(s,0);
  assert.equal(world.railCars.length,2);let coloured=0;
  for(const b of s.buildings.filter(b=>b.type.startsWith('rail-')||b.type==='station'))world.buildings.get(b.id).root.traverse(n=>{if(n.isMesh&&n.geometry.attributes.color){coloured++;assert.equal(n.material.vertexColors,true);}});
  assert.equal(coloured,10,'each rail tile keeps its baked palette');const lead=world.railCars[0],before=lead.position.clone();
  for(let i=0;i<70;i++)tick(s,.1);world.sync(s);world.update(s,0);
  assert.equal(world.railCars[0],lead);assert.ok(lead.position.distanceTo(before)>.5);
  const expected=pointOnRail(world.railRoute,s.train.distance);assert.ok(Math.abs(lead.position.x-expected.x)<1e-6);assert.ok(Math.abs(lead.position.z-expected.z)<1e-6);
  for(const b of [...s.buildings].filter(b=>b.type.startsWith('rail-')||b.type==='station'))assert.ok(remove(s,b.c,b.r).ok);
  world.sync(s);assert.equal(world.railCars,null);
});

test('arriving visitors find the ride, and closing finishes its lap before track work',()=>{
  const s=railwayFixture(),station=s.buildings.find(b=>b.type==='station');
  for(let i=0;i<2500&&!s.train.passengers.length;i++)tick(s,.1);
  assert.ok(s.train.passengers.length,'natural visitors walk from the gate, watch animals and board');
  const paid=s.stats.rides;assert.ok(paid>0);assert.equal(toggleRailway(s,station.id).closed,true);
  assert.equal(restore(serialize(s)).buildings.find(b=>b.id===station.id).closed,true);
  for(let i=0;i<300;i++)tick(s,.1);
  assert.equal(s.train.passengers.length,0);assert.equal(s.train.phase,'boarding');assert.equal(s.train.distance,0);assert.equal(s.stats.rides,paid);
  assert.ok(remove(s,11,6).ok);assert.equal(railwayStatus(s).open,false);assert.ok(buy(s,'rail-straight',11,6).ok);
  assert.equal(toggleRailway(s,station.id).closed,false);assert.equal(railwayStatus(s).open,true);
  for(let i=0;i<1800&&s.stats.rides===paid;i++)tick(s,.1);assert.ok(s.stats.rides>paid);
  assert.equal(restore(serialize(s)).stats.rides,s.stats.rides);
  const pending=createGame();pending.coins=1000;buy(pending,'station',10,7,1);
  const loaded=restore(serialize(pending));assert.equal(railwayStatus(loaded).open,false);assert.equal(loaded.buildings.at(-1).remaining,8);
});

test('railway assets load on demand and restored tracks include their required models',async()=>{
  const s=createGame(),keys=startupAssetKeys(s),world=await sceneFixture(390,844,keys);assert.ok(!keys.some(key=>key.startsWith('rail-model-')));
  await world.ensureAssets(buildingAssetKeys('station'));assert.ok(buy(s,'station',10,7,1).ok);world.sync(s);world.update(s,0);
  await world.ensureAssets(buildingAssetKeys('rail-corner'));assert.ok(buy(s,'rail-corner',11,7,0).ok);world.sync(s);
  const saved=restore(serialize(s)),required=startupAssetKeys(saved);
  for(const key of [...buildingAssetKeys('station'),...buildingAssetKeys('rail-corner')])assert.ok(required.includes(key));
  const restoredWorld=await sceneFixture(390,844,required);restoredWorld.sync(saved);assert.equal(restoredWorld.railCars.length,2);
});
