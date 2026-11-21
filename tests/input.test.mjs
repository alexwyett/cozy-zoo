import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ZooWorld } from '../src/game/world.js';
import { createGame,buy } from '../src/game/simulation.js';
import { worldCell } from '../src/game/catalog.js';

// Exercise the real input handlers without a browser, renderer or listening port.
function inputFixture(){
  const handlers=new Map(),world=Object.create(ZooWorld.prototype),selections=[];
  world.canvas={addEventListener(name,handler){handlers.set(name,handler);},setPointerCapture(){}};
  world.target=new THREE.Vector3();world.placement='bench';world.positionCamera=()=>{};
  world.groundPoint=(x,z)=>new THREE.Vector3(x,0,z);world.onTap=cell=>selections.push(cell);world.bindInput();
  const emit=(type,x,y,id=1)=>handlers.get(type)({clientX:x,clientY:y,pointerId:id,pointerType:'mouse'});
  const click=(c,r)=>{const p=worldCell(c,r);emit('pointerdown',p.x,p.z);emit('pointerup',p.x,p.z);};
  return {world,selections,emit,click};
}
test('mouse can select a building tile, move toward Build, then purchase at the selected tile',()=>{
  const {world,selections,emit,click}=inputFixture();
  // Old hover behaviour changed the selection through this callback.
  world.onPreview=cell=>selections.push(cell);
  click(8,6);assert.deepEqual(selections,[{c:8,r:6}]);
  for(const p of [[8,12],[9,18],[10,24],[11,30]])emit('pointermove',...p);
  assert.deepEqual(selections,[{c:8,r:6}]);
  const state=createGame(),chosen=selections.at(-1),result=buy(state,'bench',chosen.c,chosen.r);
  assert.ok(result.ok);assert.equal(result.building.c,8);assert.equal(result.building.r,6);
  click(9,6);assert.deepEqual(selections.at(-1),{c:9,r:6});
});
test('dragging and cancelled pointer gestures pan without changing the placement tile',()=>{
  const {world,selections,emit,click}=inputFixture();click(8,6);
  emit('pointerdown',0,0);emit('pointermove',20,15);emit('pointerup',20,15);
  assert.equal(selections.length,1);assert.notEqual(world.target.length(),0);
  emit('pointerdown',1,1);emit('pointercancel',1,1);emit('pointerup',1,1);emit('pointermove',30,40);
  assert.equal(selections.length,1);click(9,6);assert.deepEqual(selections.at(-1),{c:9,r:6});
});

test('drawing gestures produce a route instead of panning, while taps and hover stay stable',()=>{
  const {world,selections,emit}=inputFixture(),events=[];world.drawMode=true;world.onDraw=(phase,cell)=>events.push({phase,cell});
  emit('pointerdown',0,0);emit('pointermove',14,8);emit('pointerup',14,8);
  assert.deepEqual(events.map(e=>e.phase),['start','move','end']);assert.equal(world.target.length(),0);assert.equal(selections.length,0);
  emit('pointermove',40,40);assert.equal(events.length,3,'hovering toward Build cannot move the drawn route');
  emit('pointerdown',1,1);emit('pointerup',1,1);assert.equal(selections.length,1,'single taps can still select a tile');
});

test('a second touch cancels the active stroke and resumes camera gestures',()=>{
  const {world,selections,emit}=inputFixture(),events=[];world.drawMode=true;world.onDraw=phase=>events.push(phase);world.zoom=()=>{};
  emit('pointerdown',0,0);emit('pointermove',14,8);emit('pointerdown',25,20,2);emit('pointermove',30,22,2);
  emit('pointerup',30,22,2);emit('pointerup',14,8);
  assert.ok(events.includes('cancel'));assert.ok(!events.includes('end'));assert.notEqual(world.target.length(),0);assert.equal(selections.length,0);
  emit('pointerdown',0,0);emit('pointermove',15,10);emit('pointercancel',15,10);assert.equal(events.at(-1),'cancel');
});
