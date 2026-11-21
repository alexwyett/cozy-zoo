import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGame,buy,canPlace,connectedPaths,approaches,tick,care,serialize,restore } from '../src/game/simulation.js';
import { LAND_PLOTS,ownsCell,canBuyLand,buyLand,landPrice } from '../src/game/land.js';
import { worldCell,gridCell } from '../src/game/catalog.js';
import { sceneFixture } from '../scripts/scene-fixture.mjs';

test('land purchases unlock 30 tiles, charge once and require adjoining owned land',()=>{
  const s=createGame();assert.equal(ownsCell(s,12,8),false);assert.equal(canPlace(s,'path',12,8).ok,false);
  assert.equal(buyLand(s,'plot:2:-1').ok,false);assert.equal(s.coins,1800);assert.equal(buyLand(s,'plot:2:1').ok,true);
  assert.equal(s.coins,1350);assert.equal(s.stats.spent,450);assert.equal(landPrice(s),600);assert.equal(buyLand(s,'plot:2:1').ok,false);assert.equal(s.coins,1350);
  let area=0;for(let c=-6;c<18;c++)for(let r=-5;r<10;r++)if(ownsCell(s,c,r))area++;assert.equal(area,150);
  s.coins=0;assert.equal(buyLand(s,'plot:2:0').ok,false);assert.equal(s.land.length,1);
});
test('paths and facilities extend into bought land and visitors reach its petting farm',()=>{
  const s=createGame();s.coins=20000;assert.ok(buyLand(s,'plot:2:1').ok);
  for(const c of [11,12,13,14])assert.ok(buy(s,'path',c,8).ok);
  const result=buy(s,'petting',13,6);assert.ok(result.ok);assert.ok(connectedPaths(s).has('14,8'));assert.ok(approaches(s,result.building).length);
  let visited=false;for(let i=0;i<2400;i++){tick(s,.1);visited||=s.visitors.some(v=>v.stage==='watching'&&v.target===result.building.id);}
  assert.equal(result.building.remaining,0);assert.ok(visited);
  assert.ok(result.building.food<100);result.building.food=20;assert.ok(care(s,result.building.id,'feed').ok);result.building.clean=20;assert.ok(care(s,result.building.id,'clean').ok);
  for(const v of s.visitors)for(const p of v.route)if(p.c!==undefined)assert.ok(ownsCell(s,p.c,p.r));
});
test('north and west expansion preserves coordinates and saves; unowned overlap is rejected',()=>{
  const s=createGame();s.coins=20000;const gate=worldCell(5,9);assert.ok(buyLand(s,'plot:-1:1').ok);
  assert.ok(buy(s,'path',0,8).ok);assert.ok(buy(s,'path',-1,8).ok);assert.ok(buy(s,'petting',-2,6).ok);
  assert.ok(buyLand(s,'plot:0:-1').ok);assert.equal(canPlace(s,'petting',-1,-2).ok,false);
  const copy=restore(serialize(s));assert.ok(copy);assert.deepEqual(copy.land,s.land);assert.deepEqual(copy.buildings,s.buildings);assert.deepEqual(copy.paths,s.paths);assert.deepEqual(worldCell(5,9),gate);assert.deepEqual(gridCell(worldCell(-3,-4).x,worldCell(-3,-4).z),{c:-3,r:-4});
  const old=JSON.parse(serialize(createGame()));delete old.land;assert.deepEqual(restore(JSON.stringify(old)).land,[]);
  for(const land of [['fake'],['plot:0:0'],['plot:2:-1'],['plot:2:1','plot:2:1']])assert.equal(restore(JSON.stringify({...old,land})),null);
  const invalid=JSON.parse(serialize(s));invalid.land=[];assert.equal(restore(JSON.stringify(invalid)),null);
});
test('all eight expansion plots can be acquired, with 360 usable tiles at the limit',()=>{
  const s=createGame();s.coins=100000;let purchased=0;
  while(purchased<8){const plot=LAND_PLOTS.find(p=>canBuyLand(s,p.id).ok);assert.ok(plot);assert.ok(buyLand(s,plot.id).ok);purchased++;}
  assert.equal(LAND_PLOTS.filter(p=>canBuyLand(s,p.id).ok).length,0);let area=0;for(let c=-6;c<18;c++)for(let r=-5;r<10;r++)area+=Number(ownsCell(s,c,r));assert.equal(area,360);assert.ok(restore(serialize(s)));
});
test('purchased ground rebuilds and the petting diorama includes three animated species',async()=>{
  const world=await sceneFixture(),s=createGame();world.sync(s);const previous=world.terrain;assert.ok(buyLand(s,'plot:2:1').ok);world.sync(s);assert.notEqual(world.terrain,previous);
  const farm=world.makeBuilding({type:'petting',c:13,r:6,level:1,remaining:0});assert.equal(farm.animals.length,3);
  for(const animal of farm.animals){
    assert.ok(animal.idle);assert.ok(animal.root.children[0].name);animal.mixer.update(.3);farm.root.updateMatrixWorld(true);animal.root.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});
    const size=new THREE.Box3().setFromObject(animal.root,true).getSize(new THREE.Vector3());assert.ok(size.y>.3&&size.y<1.1,'farm animal is visible at the pen scale');
  }
});
