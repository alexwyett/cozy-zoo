import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGame,buy,remove,canRemove,connectedPaths,tick,serialize,restore } from '../src/game/simulation.js';
import { cellKey,worldCell,VISITOR_KEYS } from '../src/game/catalog.js';
import { pathMask,createPathTile,PATH_DIRECTIONS } from '../src/game/paths.js';
import { animateVisitor } from '../src/game/visitors.js';
import { sceneFixture } from '../scripts/scene-fixture.mjs';

test('neighbour edits turn a straight path into a corner, T and cross, then back',()=>{
  const paths=new Set(['5,5','5,4','5,6']);assert.equal(pathMask(paths,5,5),5);
  paths.delete('5,6');paths.add('6,5');assert.equal(pathMask(paths,5,5),3);
  paths.add('4,5');assert.equal(pathMask(paths,5,5),11);
  paths.add('5,6');assert.equal(pathMask(paths,5,5),15);
  paths.delete('5,4');paths.delete('6,5');assert.equal(pathMask(paths,5,5),12);
});
test('all 16 path combinations have matching openings at tile edges',()=>{
  for(let mask=0;mask<16;mask++){
    const paths=new Set(['3,3']);for(const {bit,dc,dr} of PATH_DIRECTIONS)if(mask&bit)paths.add(cellKey(3+dc,3+dr));
    assert.equal(pathMask(paths,3,3),mask);
    const tile=createPathTile(mask);tile.updateMatrixWorld(true);
    for(const {bit,dc,dr} of PATH_DIRECTIONS){
      const ray=new THREE.Raycaster(new THREE.Vector3(dc*.99,2,dr*.99),new THREE.Vector3(0,-1,0));
      const hit=ray.intersectObject(tile)[0];assert.ok(hit);assert.equal(hit.point.y>.16,!!(mask&bit),`mask ${mask}, direction ${bit}`);
    }
    tile.traverse(n=>n.geometry?.dispose());
  }
});
test('digging and removing facilities refund half once, save correctly, and free their space',()=>{
  const s=createGame();assert.ok(buy(s,'path',0,5).ok);assert.ok(remove(s,0,5).ok);assert.equal(s.coins,1795);assert.equal(s.stats.refunds,5);assert.equal(remove(s,0,5).ok,false);
  const b=buy(s,'food',7,6).building;assert.ok(b);assert.equal(remove(s,7,6).refund,125);assert.ok(!s.buildings.includes(b));assert.ok(buy(s,'drink',7,6).ok);
  assert.equal(s.coins,1800-s.stats.spent+s.stats.income+s.stats.refunds);
  const saved=restore(serialize(s));assert.equal(saved.stats.refunds,130);assert.deepEqual(saved.paths,s.paths);assert.deepEqual(saved.buildings,s.buildings);
});
test('entrance, animal homes and a building’s only access cannot be dug up',()=>{
  const s=createGame();for(const [c,r] of [[5,9],[6,9],[2,6]])assert.equal(canRemove(s,c,r).ok,false);
  s.paths=['5,9','5,8','5,7','5,6'];s.buildings=[{id:'test',type:'food',c:4,r:6,level:1,remaining:0}];
  assert.equal(canRemove(s,5,7).ok,false);s.paths.push('6,8','6,7','6,6');assert.ok(remove(s,5,7).ok);assert.ok(connectedPaths(s).has('5,6'));
});
test('occupied paths are protected; future routes are recalculated after digging',()=>{
  const s=createGame();for(let i=0;i<100;i++)tick(s,.1);const v=s.visitors.find(v=>v.admitted);assert.ok(v);
  v.cell={c:5,r:8};Object.assign(v,worldCell(5,8));v.route=[worldCell(5,7),worldCell(5,6),worldCell(5,5),worldCell(4,5)];v.stage='toPen';v.target='b1';
  assert.equal(canRemove(s,5,8).ok,false);assert.equal(canRemove(s,5,7).ok,false);
  assert.ok(remove(s,5,5).ok);for(const guest of s.visitors)for(const p of guest.route)if(p.c!==undefined)assert.notEqual(cellKey(p.c,p.r),'5,5');
  for(let i=0;i<150;i++)tick(s,.1);assert.ok(Number.isFinite(v.x)&&Number.isFinite(v.z));
});
test('removing a facility cancels a service without charging or satisfying a ghost order',()=>{
  const s=createGame(),b=buy(s,'food',7,6).building;b.remaining=0;
  for(let i=0;i<100;i++)tick(s,.1);const v=s.visitors.find(v=>v.admitted);assert.ok(v);
  Object.assign(v,worldCell(6,6),{cell:{c:6,r:6},stage:'serving',route:[],target:b.id,need:'hunger',wait:.05,hunger:90});
  const income=s.stats.income,wallet=v.wallet;assert.ok(remove(s,7,6).ok);assert.notEqual(v.target,b.id);tick(s,.1);
  assert.equal(v.wallet,wallet);assert.equal(s.stats.income,income);assert.ok(v.hunger>=90);
});
test('actual scene removes facilities, refreshes equal-count layouts, and loads all Kenney rigs',async()=>{
  const world=await sceneFixture(),s=createGame(),b=buy(s,'food',7,6).building;world.sync(s);const root=world.buildings.get(b.id).root,terrain=world.terrain;
  assert.ok(remove(s,7,6).ok);assert.ok(buy(s,'food',8,6).ok);world.sync(s);assert.equal(world.buildings.has(b.id),false);assert.equal(root.parent,null);assert.notEqual(world.terrain,terrain);
  for(let i=0;i<VISITOR_KEYS.length;i++){
    const visitor=world.person(i);assert.equal(visitor.name,VISITOR_KEYS[i]);assert.ok(visitor.userData.idle&&visitor.userData.walk);
    let skeleton;visitor.traverse(n=>{if(n.isSkinnedMesh){skeleton=n.skeleton;assert.ok(n.geometry.attributes.color);assert.equal(n.material.map,null);}});assert.ok(skeleton);
    const clone=world.person(i);let other;clone.traverse(n=>{if(n.isSkinnedMesh)other=n.skeleton;});assert.notEqual(skeleton,other);
    const before=skeleton.bones.map(b=>b.quaternion.toArray().join(',')).join(';');animateVisitor(visitor,.35,true);
    assert.notEqual(skeleton.bones.map(b=>b.quaternion.toArray().join(',')).join(';'),before);
    const size=new THREE.Box3().setFromObject(visitor).getSize(new THREE.Vector3());assert.ok(size.y>.8*.7&&size.y<1.5*.7,visitor.name);
  }
});
