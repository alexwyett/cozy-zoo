import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame,tick,buy } from '../src/game/simulation.js';
import { VISITOR_SPACING,VISITOR_SCALE,onFoot,walkable,moveVisitors } from '../src/game/crowd.js';
import { worldCell } from '../src/game/catalog.js';
import { sceneFixture } from '../scripts/scene-fixture.mjs';
import { railwayFixture } from '../scripts/railway-fixture.mjs';

test('busy zoo traffic maintains separation, stays on walkable ground and reaches the exit',()=>{
  const s=createGame();s.coins=10000;for(const [type,c] of [['food',7],['drink',8],['toilet',9],['gift',10]])buy(s,type,c,6);
  for(let n=0;n<2400;n++){
    tick(s,.1);const guests=s.visitors.filter(onFoot);
    for(let i=0;i<guests.length;i++){
      assert.ok(walkable(s,guests[i].x,guests[i].z));
      for(let j=i+1;j<guests.length;j++)assert.ok(Math.hypot(guests[i].x-guests[j].x,guests[i].z-guests[j].z)>=VISITOR_SPACING-.01,'visitors keep their personal space');
    }
  }
  assert.ok(s.stats.admissions>15);assert.ok(s.stats.departures>5);assert.ok(s.stats.sales>10);
});
test('opposing guests pass each other and an initially overlapping group separates',()=>{
  const s=createGame();s.visitors=[];s.time=0;
  for(const [i,start,end] of [[0,7,10],[1,10,7]]){const p=worldCell(start,5);s.visitors.push({id:'v'+i,stage:'toPen',cell:{c:start,r:5},x:p.x,z:p.z,route:[worldCell(end,5)]});}
  for(let n=0;n<160;n++){s.time+=.05;moveVisitors(s,.05);assert.ok(Math.hypot(s.visitors[0].x-s.visitors[1].x,s.visitors[0].z-s.visitors[1].z)>=VISITOR_SPACING-.005);}
  assert.ok(s.visitors[0].x>s.visitors[1].x,'opposing visitors pass rather than remaining locked together');
});
test('visitor size is reduced 30 percent and visible positions match collision positions',async()=>{
  assert.equal(VISITOR_SCALE,.7);const s=createGame(),p=worldCell(5,8);s.visitors=[{id:'v101',color:0,stage:'watching',cell:{c:5,r:8},x:p.x,z:p.z,route:[]}];
  const world=await sceneFixture();world.sync(s);world.update(s,0);const person=world.guests.get('v101');assert.equal(person.scale.x,.7);assert.equal(person.position.x,p.x);assert.equal(person.position.z,p.z);
});

test('opposing visitors pass on a bridge without overlapping or walking outside its ramps',()=>{
  const s=railwayFixture();s.visitors=[];
  for(const [i,start,route] of [[0,7,[8,9,10]],[1,10,[9,8,7]]]){
    const p=worldCell(start,5);s.visitors.push({id:'v'+i,stage:'toPen',cell:{c:start,r:5},x:p.x,z:p.z,route:route.map(c=>worldCell(c,5))});
  }
  for(let n=0;n<260;n++){
    s.time+=.05;moveVisitors(s,.05);const [a,b]=s.visitors;
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=VISITOR_SPACING-.005);assert.ok(walkable(s,a.x,a.z)&&walkable(s,b.x,b.z));
  }
  assert.ok(s.visitors[0].x>s.visitors[1].x);
});
