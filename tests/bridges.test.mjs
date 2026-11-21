import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGame,buy,canPlace,canRemove,remove,rotate,connectedPaths,approaches,serialize,restore,tick } from '../src/game/simulation.js';
import { bridgeCells,bridgeHeightAt,visitorHeight,pathNeighbors,isBridge,BRIDGE_HEIGHT,PATH_HEIGHT } from '../src/game/bridges.js';
import { worldCell } from '../src/game/catalog.js';
import { railwayStatus } from '../src/game/railway.js';
import { railwayFixture } from '../scripts/railway-fixture.mjs';
import { sceneFixture } from '../scripts/scene-fixture.mjs';
import { planStroke,buildStroke } from '../src/game/draw-build.js';

function groundHeight(world,c,r){
  world.terrain.updateMatrixWorld(true);const p=worldCell(c,r);
  const ray=new THREE.Raycaster(new THREE.Vector3(p.x+.1,3,p.z+.1),new THREE.Vector3(0,-1,0));
  const hit=ray.intersectObject(world.terrain,true)[0];assert.ok(hit,'ground remains under each bridge tile');return hit.point.y;
}

test('bridge decks and ramps replace pavement in every orientation while keeping adjacent paths',async()=>{
  const world=await sceneFixture();
  for(let rotation=0;rotation<4;rotation++){
    const s=createGame(),b={id:'bridge',type:'rail-crossing',c:6,r:5,rotation,level:1,remaining:0},horizontal=rotation%2===0;
    const cells=[-2,-1,0,1,2].map(offset=>({c:b.c+(horizontal?offset:0),r:b.r+(horizontal?0:offset)}));
    s.buildings=[b];s.paths=cells.map(p=>`${p.c},${p.r}`);const paths=[...s.paths];world.sync(s);
    for(const p of bridgeCells(b))assert.ok(groundHeight(world,p.c,p.r)<.16,'no pavement below the deck or ramps');
    for(const p of [cells[0],cells[4]])assert.ok(groundHeight(world,p.c,p.r)>.16,'approach pavement stays visible');
    assert.deepEqual(s.paths,paths,'bridge walkability is preserved');
    b.levelCrossing=true;world.sync(s);for(const p of bridgeCells(b))assert.ok(groundHeight(world,p.c,p.r)>.16,'legacy level crossings retain their pavement');
    s.buildings=[];world.sync(s);for(const p of cells)assert.ok(groundHeight(world,p.c,p.r)>.16,'removing a bridge restores the underlying paths');
  }
});

test('drawn and individual bridge previews hide pavement, cancel restores it, and built bridges retain the change',async()=>{
  const world=await sceneFixture(),s=railwayFixture();assert.ok(remove(s,9,5).ok);world.sync(s);
  const cells=[{c:8,r:5},{c:9,r:5},{c:10,r:5}],before=serialize(s);
  for(const p of cells)assert.ok(groundHeight(world,p.c,p.r)>.16);
  const stroke=[{c:9,r:5}],plan=planStroke(s,'rail-straight',stroke);assert.ok(plan.ok,plan.reason);
  world.setPlacement('rail-straight');world.showStroke(plan);world.sync(s);
  for(const p of cells)assert.ok(groundHeight(world,p.c,p.r)<.16);
  world.clearStroke();world.sync(s);for(const p of cells)assert.ok(groundHeight(world,p.c,p.r)>.16);
  world.showPreview('rail-crossing',9,5,true);world.sync(s);
  for(const p of cells)assert.ok(groundHeight(world,p.c,p.r)<.16);
  world.setPlacement(null);world.sync(s);for(const p of cells)assert.ok(groundHeight(world,p.c,p.r)>.16);
  assert.equal(serialize(s),before,'previews never change the saved park');
  assert.ok(buildStroke(s,'rail-straight',stroke).ok);world.sync(s);
  for(const p of cells)assert.ok(groundHeight(world,p.c,p.r)<.16);
  assert.ok(connectedPaths(s).has('9,5'));assert.ok(railwayStatus(s).open);
  assert.ok(remove(s,9,5).ok);world.sync(s);for(const p of cells)assert.ok(groundHeight(world,p.c,p.r)>.16);
  // A drawn path can also supply a new ramp before it reaches existing track.
  assert.ok(remove(s,9,5).ok);assert.ok(buy(s,'rail-straight',9,5).ok);assert.ok(remove(s,8,5).ok);
  const pathPlan=planStroke(s,'path',[{c:7,r:5},...cells]);assert.ok(pathPlan.ok,pathPlan.reason);
  world.sync(s);world.showStroke(pathPlan);world.sync(s);world.scene.updateMatrixWorld(true);
  const ramp=worldCell(8,5),ray=new THREE.Raycaster(new THREE.Vector3(ramp.x+.1,.3,ramp.z+.1),new THREE.Vector3(0,-1,0));
  const surfaces=ray.intersectObjects([world.terrain,...world.strokeModels.map(node=>node.root)],true);
  assert.ok(surfaces[0].point.y<.16,'new path previews do not draw pavement beneath their own bridge ramps');
  world.clearStroke();world.sync(s);
});

test('bridges build in both axes with ramp paths, clear footprints and preserved rail loops',()=>{
  for(let rotation=0;rotation<4;rotation++){
    const s=createGame();s.coins=10000;
    let c,r;
    if(rotation%2===0){for(const [x,y] of [[6,4],[6,3],[7,3],[8,3]])assert.ok(buy(s,'path',x,y).ok);assert.ok(buy(s,'station',8,4,0).ok);c=8;r=5;}
    else{buy(s,'path',6,4);assert.ok(buy(s,'station',5,4,1).ok);c=6;r=4;}
    const result=buy(s,'rail-crossing',c,r,rotation);assert.ok(result.ok,result.reason);
    for(const p of bridgeCells(result.building))assert.ok(s.paths.includes(`${p.c},${p.r}`));
    assert.equal(connectedPaths(s).has(`${c},${r}`),true);
    const loaded=restore(serialize(s));assert.ok(isBridge(loaded.buildings.at(-1)));
  }
  const s=railwayFixture();assert.equal(railwayStatus(s).open,true);
  assert.equal(canRemove(s,8,5).ok,false,'ramps stay until their bridge is removed');
  assert.ok(remove(s,9,5).ok);assert.ok(s.paths.includes('8,5')&&s.paths.includes('9,5')&&s.paths.includes('10,5'));
  assert.equal(visitorHeight(s,worldCell(9,5).x,worldCell(9,5).z),PATH_HEIGHT);
});

test('laying a garden path across existing straight rails creates a bridge and charges once',()=>{
  const s=railwayFixture();assert.ok(remove(s,9,5).ok);assert.ok(remove(s,9,5).ok);assert.ok(buy(s,'rail-straight',9,5).ok);
  const coins=s.coins,result=buy(s,'path',9,5);assert.ok(result.ok);assert.ok(result.bridge);assert.equal(s.coins,coins-10);
  assert.equal(s.buildings.find(b=>b.c===9&&b.r===5).type,'rail-crossing');assert.ok(railwayStatus(s).open);
  assert.equal(buy(s,'path',9,5).ok,false);assert.equal(s.coins,coins-10);
  assert.equal(canPlace(s,'path',9,4).ok,false,'curved rails cannot be bridged');
});

test('bridge placement rejects blocked ramps, unowned land and loss of facility access without spending',()=>{
  const s=railwayFixture();remove(s,9,5);const coins=s.coins;
  s.buildings.push({id:'blocked',type:'bench',c:8,r:5,rotation:0,level:1,remaining:0});
  assert.equal(canPlace(s,'rail-crossing',9,5).ok,false);assert.equal(buy(s,'rail-crossing',9,5).ok,false);assert.equal(s.coins,coins);
  s.buildings.pop();s.buildings.push({id:'only-access',type:'food',c:10,r:4,rotation:0,level:1,remaining:0});
  assert.ok(approaches(s,s.buildings.at(-1)).length);assert.equal(canPlace(s,'rail-crossing',9,5).ok,false,'ramps cannot be the only entrance to a service');
  s.buildings.pop();assert.ok(buy(s,'rail-crossing',9,5).ok);
  assert.ok(pathNeighbors(s,9,5).every(p=>p.r===5));assert.ok(pathNeighbors(s,8,5).every(p=>p.r===5),'ramps have no side exits');
  assert.equal(canPlace(s,'food',8,4).ok,false,'guests need level ground at service entrances');
  assert.equal(canPlace(s,'rail-crossing',0,5).ok,false,'western ramp would be outside owned land');
});

test('visitor elevation is continuous on ramps and bridge changes wait for crossing guests',async()=>{
  const s=railwayFixture(),b=s.buildings.find(isBridge),center=worldCell(b.c,b.r);
  for(let rotation=0;rotation<4;rotation++){
    const bridge={...b,rotation},horizontal=rotation%2===0;
    let previous=PATH_HEIGHT;
    for(let along=-3;along<=3;along+=.025){
      const height=bridgeHeightAt(bridge,center.x+(horizontal?along:0),center.z+(horizontal?0:along));
      assert.ok(Math.abs(height-previous)<.02);previous=height;
    }
    assert.equal(bridgeHeightAt(bridge,center.x,center.z),BRIDGE_HEIGHT);
  }
  s.visitors=[{id:'v101',color:0,admitted:true,stage:'resting',wait:999,cell:{c:9,r:5},x:center.x,z:center.z,route:[],age:0,stay:999,hunger:0,thirst:0,bladder:0,happiness:100,wallet:50}];
  assert.equal(canRemove(s,b.c,b.r).ok,false);assert.equal(rotate(s,b.id).ok,false);
  const world=await sceneFixture();world.sync(s);world.update(s,0);assert.equal(world.guests.get('v101').position.y,BRIDGE_HEIGHT);
  world.scene.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(world.buildings.get(b.id).root);assert.ok(bounds.max.x-bounds.min.x>5.8);
  const ray=new THREE.Raycaster(new THREE.Vector3(center.x+.1,4,center.z),new THREE.Vector3(0,-1,0));
  const surfaces=ray.intersectObject(world.buildings.get(b.id).root,true);assert.ok(Math.abs(surfaces[0].point.y-BRIDGE_HEIGHT)<.01,'deck matches visitor feet');
  const trainBounds=new THREE.Box3().setFromObject(world.railCars[0]);assert.ok(trainBounds.max.y<BRIDGE_HEIGHT-.15,'train fits below the deck');
  s.visitors[0].route=[worldCell(8,5),worldCell(7,5)];s.visitors[0].stage='toPen';
  for(let i=0;i<28;i++)tick(s,.1);world.sync(s);world.update(s,0);assert.equal(world.guests.get('v101').position.y,PATH_HEIGHT,'guest descends to ground before leaving the ramp');
  s.visitors=[];assert.ok(canRemove(s,b.c,b.r).ok);
});

test('older cramped crossings remain loadable without overlapping buildings with new ramps',()=>{
  const data=JSON.parse(serialize(railwayFixture()));
  data.paths=data.paths.filter(key=>key!=='8,5');
  data.buildings.push({id:'old-bench',type:'bench',c:8,r:5,rotation:0,level:1,remaining:0});
  const loaded=restore(JSON.stringify(data));assert.ok(loaded);const crossing=loaded.buildings.find(b=>b.type==='rail-crossing');
  assert.equal(crossing.levelCrossing,true);assert.ok(!isBridge(crossing));assert.equal(railwayStatus(loaded).open,true);
  assert.ok(restore(serialize(loaded)));
});
