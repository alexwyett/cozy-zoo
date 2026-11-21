import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { sceneFixture } from '../scripts/scene-fixture.mjs';
import { createGame,buy,tick,upgrade } from '../src/game/simulation.js';
import { CATALOG } from '../src/game/catalog.js';

test('actual starter scene assembles with a gate, animated penguins, visitors and transport',async()=>{
  const world=await sceneFixture(),state=createGame();world.sync(state);assert.ok(world.templates.has('entrance')&&world.templates.has('penguin'));assert.equal(world.buildings.size,1);assert.equal(world.buildings.get('b1').animals.length,2);
  for(let i=0;i<90;i++)tick(state,0.1);world.sync(state);world.update(state,0.1);assert.ok(world.guests.size>0);assert.ok(world.cars.size>0);
  world.scene.updateMatrixWorld(true);let vertices=0;
  world.scene.traverse(node=>{if(node.isMesh){for(const value of node.geometry.attributes.position.array)assert.ok(Number.isFinite(value));vertices+=node.geometry.attributes.position.count;}});
  assert.ok(vertices>0);assert.ok(world.renderer);world.zoom(0.8);world.home();
});
test('every shop item assembles from the supplied models and completes construction',async()=>{
  const world=await sceneFixture(390,844);
  for(const [type,spec] of Object.entries(CATALOG)){
    if(['path','rail'].includes(spec.kind))continue;
    const state=createGame();state.coins=100000;const result=buy(state,type,8,6);assert.ok(result.ok,type);const b=result.building;
    const building=world.makeBuilding(b);assert.ok(building.root.children.length>0,type+' construction');
    for(let i=0;i<200;i++)tick(state,0.1);
    const ready=world.makeBuilding(b);assert.ok(ready.root.children.length>0);
    if(spec.kind==='pen'){assert.ok(ready.animals.length>0);for(const animal of ready.animals)assert.ok(animal.idle&&animal.walk,type+' clips');}
    ready.root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(ready.root);assert.ok(bounds.min.toArray().every(Number.isFinite));assert.ok(bounds.max.toArray().every(Number.isFinite));
  }
});
