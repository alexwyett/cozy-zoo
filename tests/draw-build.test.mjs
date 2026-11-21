import test from 'node:test';
import assert from 'node:assert/strict';
import { extendStroke,planStroke,buildStroke } from '../src/game/draw-build.js';
import { createGame,buy,remove,serialize,tick } from '../src/game/simulation.js';
import { railwayStatus } from '../src/game/railway.js';
import { railwayFixture } from '../scripts/railway-fixture.mjs';
const cells=points=>points.map(([c,r])=>({c,r}));

test('drawing fills skipped tiles, backtracks and closes loops without duplicate purchases',()=>{
  let stroke=extendStroke(cells([[1,5]]),{c:1,r:2});assert.deepEqual(stroke,cells([[1,5],[1,4],[1,3],[1,2]]));
  stroke=extendStroke(stroke,{c:1,r:4});assert.deepEqual(stroke,cells([[1,5],[1,4]]));
  assert.deepEqual(extendStroke(stroke,{c:1,r:5}),cells([[1,5]]));
  const diagonal=extendStroke(cells([[0,0]]),{c:3,r:2});assert.equal(diagonal.length,6);
  for(let i=1;i<diagonal.length;i++)assert.equal(Math.abs(diagonal[i].c-diagonal[i-1].c)+Math.abs(diagonal[i].r-diagonal[i-1].r),1);
});
test('a path stroke previews its total and commits all its pieces together',()=>{
  const s=createGame(),route=cells([[1,5],[1,4],[1,3],[2,3]]),before=serialize(s),plan=planStroke(s,'path',route);
  assert.ok(plan.ok,plan.reason);assert.equal(plan.cost,30);assert.equal(serialize(s),before);
  const pen=s.buildings[0],result=buildStroke(s,'path',route);assert.ok(result.ok);assert.equal(s.coins,1770);assert.equal(s.buildings[0],pen);
  for(const p of route)assert.ok(s.paths.includes(`${p.c},${p.r}`));assert.equal(planStroke(s,'path',route).ok,false);
  const reverse=createGame();assert.ok(buildStroke(reverse,'path',[...route].reverse()).ok,'routes may be drawn toward the existing path as well as away from it');
});
test('invalid and unaffordable routes spend nothing and cannot leave partial construction',()=>{
  const s=createGame(),bad=cells([[1,5],[2,5],[2,6]]),before=serialize(s);assert.equal(buildStroke(s,'path',bad).ok,false);assert.equal(serialize(s),before);
  s.coins=15;const poor=serialize(s),route=cells([[1,5],[1,4],[1,3],[1,2]]),plan=planStroke(s,'path',route);
  assert.equal(plan.cost,30);assert.equal(plan.ok,false);assert.equal(buildStroke(s,'path',route).ok,false);assert.equal(serialize(s),poor);
});
test('drawn railway loops pick curves, straight orientations and bridges automatically',()=>{
  const s=createGame();s.coins=10000;const station=buy(s,'station',10,7,1).building;
  const route=cells([[10,7],[11,7],[11,6],[11,5],[11,4],[10,4],[9,4],[9,5],[9,6],[9,7],[10,7]]);
  const plan=planStroke(s,'rail-straight',route);assert.ok(plan.ok,plan.reason);assert.equal(plan.cost,265);assert.equal(plan.count,9);
  assert.equal(plan.items.filter(p=>p.type==='rail-corner').length,4);assert.equal(plan.items.filter(p=>p.type==='rail-crossing').length,1);
  assert.ok(buildStroke(s,'rail-corner',route).ok);assert.equal(s.buildings.find(b=>b.id===station.id),station);
  for(let i=0;i<81;i++)tick(s,.1);assert.equal(railwayStatus(s).open,true);assert.ok(s.paths.includes('8,5')&&s.paths.includes('10,5'));
});
test('drawn paths bridge existing straight track and reject side exits from ramps',()=>{
  const s=railwayFixture();remove(s,9,5);remove(s,9,5);buy(s,'rail-straight',9,5);
  const route=cells([[8,5],[9,5],[10,5]]),plan=planStroke(s,'path',route);assert.ok(plan.ok,plan.reason);assert.equal(plan.cost,10);assert.ok(plan.items[1].bridge);
  assert.ok(buildStroke(s,'path',route).ok);assert.ok(railwayStatus(s).open);
  assert.equal(planStroke(s,'path',cells([[8,5],[8,4]])).ok,false);
});
