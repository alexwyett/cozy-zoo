import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGame,buy,rotate,serialize,restore,approaches,tick } from '../src/game/simulation.js';
import { CATALOG,worldCell } from '../src/game/catalog.js';
import { sceneFixture } from '../scripts/scene-fixture.mjs';

test('objects can be bought in each orientation and four turns restore their direction',()=>{
  for(const type of Object.keys(CATALOG).filter(type=>!['path','rail'].includes(CATALOG[type].kind)))for(let turn=0;turn<4;turn++){
    const s=createGame();s.coins=100000;const {building:b,ok}=buy(s,type,8,6,turn);assert.ok(ok,type);
    assert.equal(b.rotation,turn);const before=serialize(s),access=approaches(s,b);
    for(let i=0;i<4;i++){assert.ok(rotate(s,b.id).ok);assert.equal(b.rotation,(turn+i+1)%4);}
    assert.equal(serialize(s),before,'rotation preserves money, timers, welfare and layout');assert.deepEqual(approaches(s,b),access);
  }
});
test('orientation survives saves and construction; older saves default to zero',()=>{
  const s=createGame(),b=buy(s,'food',7,6,3).building;assert.ok(rotate(s,b.id).ok);assert.equal(b.rotation,0);assert.ok(rotate(s,b.id).ok);
  const loaded=restore(serialize(s)),saved=loaded.buildings.find(x=>x.id===b.id);assert.equal(saved.rotation,1);
  for(let i=0;i<100;i++)tick(loaded,.1);assert.equal(saved.remaining,0);assert.equal(saved.rotation,1);
  const old=JSON.parse(serialize(s));for(const item of old.buildings)delete item.rotation;
  assert.ok(restore(JSON.stringify(old)).buildings.every(item=>item.rotation===0));
  for(const invalid of [null,'90',NaN,Infinity,1.5]){old.buildings[0].rotation=invalid;assert.equal(restore(JSON.stringify(old)).buildings[0].rotation,0);}
  const coins=s.coins;assert.equal(buy(s,'bench',8,6,NaN).ok,false);assert.equal(s.coins,coins);assert.equal(rotate(s,'missing').ok,false);
});
test('scene and placement preview rotate actual meshes around their footprint centre',async()=>{
  const world=await sceneFixture(),s=createGame();world.sync(s);const pen=world.buildings.get('b1'),mixer=pen.animals[0].mixer;
  assert.ok(rotate(s,'b1').ok);world.sync(s);assert.equal(world.buildings.get('b1'),pen);assert.equal(pen.animals[0].mixer,mixer);assert.equal(pen.root.rotation.y,-Math.PI/2);
  const centre=worldCell(2,6);assert.equal(pen.root.position.x,centre.x+1);assert.equal(pen.root.position.z,centre.z+1);
  const animal=pen.animals[0].root;pen.root.updateMatrixWorld(true);const local=animal.position.clone(),actual=animal.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(actual.z-(pen.root.position.z+local.x))<1e-6);
  let disposed=0;world.templates.get('penguin').scene.traverse(n=>{if(n.isMesh)n.geometry.addEventListener('dispose',()=>disposed++);});
  world.setPlacement('penguin');world.showPreview('penguin',8,6,true,2);
  assert.ok(world.placementModel.animals.length);assert.equal(world.placementModel.root.rotation.y,-Math.PI);
  world.showPreview('penguin',8,6,true,3);assert.equal(world.placementModel.root.rotation.y,-Math.PI*1.5);
  world.setPlacement(null);assert.equal(world.placementModel,null);assert.equal(disposed,0,'preview cleanup preserves shared animal geometry');
  const b=buy(s,'food',7,6,1).building;world.sync(s);assert.equal(world.buildings.get(b.id).root.rotation.y,-Math.PI/2);
  for(let i=0;i<100;i++)tick(s,.1);world.sync(s);assert.equal(world.buildings.get(b.id).root.rotation.y,-Math.PI/2);
});
