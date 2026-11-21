import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { sceneFixture } from '../scripts/scene-fixture.mjs';
import { railwayFixture } from '../scripts/railway-fixture.mjs';
import { tick,toggleRailway } from '../src/game/simulation.js';
import { animateVisitor } from '../src/game/visitors.js';
import { VISITOR_KEYS,worldCell } from '../src/game/catalog.js';
import { BRIDGE_HEIGHT } from '../src/game/bridges.js';
import { pointOnRail } from '../src/game/railway.js';

test('all 13 visitors use Kenney sitting poses and return to their original walking rig',async()=>{
  const world=await sceneFixture();
  for(let style=0;style<VISITOR_KEYS.length;style++){
    const person=world.person(style),data=person.userData,leg=data.model.getObjectByName('leg-left');
    assert.ok(data.sit,'original sit clip retained in every prepared model');
    animateVisitor(person,0,false,true);assert.equal(data.mode,'sit');assert.ok(Math.abs(leg.quaternion.x)>.5,'legs bend into sitting pose');
    const seated=leg.quaternion.clone();animateVisitor(person,.2,true);assert.equal(data.mode,'walk');assert.ok(leg.quaternion.angleTo(seated)>.2);
    assert.equal(data.model,person.children[0]);assert.equal(data.sit.isRunning(),false);
  }
});

test('real riders occupy stable carriage seats through curves and walk again after disembarking',async()=>{
  const s=railwayFixture(),station=s.buildings.find(b=>b.type==='station'),p=worldCell(10,8),world=await sceneFixture();
  s.nextArrival=9999;s.visitors=[];
  for(let i=0;i<5;i++)s.visitors.push({id:'v'+(101+i),color:i*2,stage:'railQueue',admitted:true,cell:{c:10,r:8},x:p.x,z:p.z,route:[],target:station.id,wait:0,age:10,stay:999,visits:1,hunger:0,thirst:0,bladder:0,happiness:95,wallet:50});
  world.sync(s);world.update(s,0);const models=s.visitors.map(v=>world.guests.get(v.id)),mixers=models.map(m=>m.userData.mixer);
  tick(s,.1);world.sync(s);world.update(s,.1);assert.equal(s.train.passengers.length,4);
  assert.equal(models[4].parent,world.scene,'waiting guest remains on the path');assert.notEqual(models[4].userData.mode,'sit');
  const seatPositions=models.slice(0,4).map(model=>model.position.clone());
  for(let i=0;i<4;i++){
    const model=models[i];assert.equal(model.parent,world.railCars[Math.floor(i/2)]);assert.ok(model.visible);assert.equal(model.userData.mode,'sit');assert.equal(model.userData.mixer,mixers[i]);
  }
  toggleRailway(s,station.id);
  for(let i=0;i<70;i++)tick(s,.1);world.sync(s);world.update(s,.1);world.scene.updateMatrixWorld(true);
  for(const model of models.slice(0,4))model.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});
  for(let i=0;i<4;i++){
    const model=models[i],car=model.parent,bounds=new THREE.Box3().setFromObject(model,true);
    assert.ok(bounds.min.y>.34,'rider feet stay above track and wheels');assert.ok(bounds.max.y<BRIDGE_HEIGHT-.15,'seated riders fit underneath footbridges');
    assert.deepEqual(model.position,seatPositions[i],'seats stay fixed as their carriage turns');
    const heading=pointOnRail(world.railRoute,s.train.distance-Math.floor(i/2)*.86).heading;
    assert.ok(model.getWorldDirection(new THREE.Vector3()).dot(new THREE.Vector3(Math.sin(heading),0,Math.cos(heading)))>.999,'faces direction of travel');
    assert.ok(model.getWorldPosition(new THREE.Vector3()).distanceTo(car.position)<1,'follows its carriage through the bend');
  }
  for(let i=0;i<200&&s.train.passengers.length;i++)tick(s,.1);world.sync(s);world.update(s,.1);
  assert.equal(s.train.passengers.length,0);
  for(let i=0;i<4;i++){assert.equal(models[i].parent,world.scene);assert.equal(models[i].scale.x,.7);assert.notEqual(models[i].userData.mode,'sit');assert.ok(models[i].visible);assert.equal(world.guests.get(s.visitors[i].id),models[i]);}
  assert.equal(world.guests.size,5,'no duplicate boarding or disembarking models');
});

test('removing a visitor while seated detaches its model without disposing shared character geometry',async()=>{
  const world=await sceneFixture(),s=railwayFixture();s.visitors=[{id:'v123',color:0,stage:'riding',x:0,z:0,route:[]}];s.train.passengers=['v123'];world.sync(s);world.update(s,0);
  const model=world.guests.get('v123'),car=model.parent;let disposed=0;
  model.traverse(n=>{if(n.isMesh)n.geometry.addEventListener('dispose',()=>disposed++);});
  s.visitors=[];s.train.passengers=[];world.sync(s);assert.equal(world.guests.size,0);assert.equal(model.parent,null);assert.ok(!car.children.includes(model));assert.equal(disposed,0);
});
