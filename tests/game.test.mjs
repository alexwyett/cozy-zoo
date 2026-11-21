import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame,buy,care,upgrade,tick,canPlace,connectedPaths,approaches,serialize,restore,summary,drainEvents } from '../src/game/simulation.js';
import { CATALOG,ADMISSION,GATE,cellKey } from '../src/game/catalog.js';

function advance(s,seconds,observe=()=>{}){for(let i=0;i<Math.round(seconds*10);i++){tick(s,0.1);observe();}}
test('starter zoo has one accessible pen, gate paths and 1,800 coins',()=>{
  const s=createGame();assert.equal(s.coins,1800);assert.equal(s.buildings.length,1);assert.equal(s.buildings[0].type,'penguin');assert.ok(connectedPaths(s).has(cellKey(GATE.c,GATE.r)));assert.ok(approaches(s,s.buildings[0]).length);
});
test('overlapping, detached, outside and unaffordable purchases do not spend money',()=>{
  const s=createGame(),coins=s.coins;
  for(const [type,c,r] of [['lion',2,6],['lion',0,0],['food',5,5],['food',-1,2],['elephant',11,9]])assert.equal(buy(s,type,c,r).ok,false);
  s.coins=5;assert.equal(buy(s,'food',7,6).ok,false);assert.equal(s.coins,5);s.coins=coins;assert.equal(s.stats.spent,0);
});
test('path extensions must connect to the gate network and cannot replace a pen',()=>{
  const s=createGame();assert.equal(buy(s,'path',0,0).ok,false);assert.equal(buy(s,'path',0,5).ok,true);assert.ok(connectedPaths(s).has('0,5'));assert.equal(s.coins,1790);assert.equal(buy(s,'path',2,6).ok,false);
});
test('both sides of the entrance accept facilities and paths while gate access stays open',()=>{
  const s=createGame();assert.ok(buy(s,'food',4,9).ok);assert.ok(buy(s,'drink',7,9).ok);
  for(const c of [5,6]){assert.equal(buy(s,'food',c,9).ok,false);assert.ok(connectedPaths(s).has(cellKey(c,9)));}
  advance(s,220);assert.ok(s.stats.admissions>0);assert.ok(s.events.some(e=>e.kind==='income'&&e.source==='food'));assert.ok(s.events.some(e=>e.kind==='income'&&e.source==='drink'));
  const paths=createGame();for(const c of [4,7]){assert.ok(buy(paths,'path',c,9).ok);assert.ok(connectedPaths(paths).has(cellKey(c,9)));}
});
test('construction takes the advertised active time and produces exactly one completion',()=>{
  const s=createGame(),result=buy(s,'food',7,6);assert.equal(result.ok,true);assert.equal(result.building.remaining,CATALOG.food.buildTime);advance(s,3);assert.ok(result.building.remaining>0);advance(s,5);assert.equal(result.building.remaining,0);assert.equal(drainEvents(s).filter(e=>e.kind==='complete'&&e.id===result.building.id).length,1);advance(s,2);assert.equal(drainEvents(s).filter(e=>e.kind==='complete').length,0);
});
test('care changes only its own need and feeding charges once',()=>{
  const s=createGame(),b=s.buildings[0],cost=CATALOG.penguin.feedCost,clean=b.clean;
  assert.equal(care(s,b.id,'feed').ok,true);assert.equal(b.food,100);assert.equal(b.clean,clean);assert.equal(s.coins,1800-cost);assert.equal(care(s,b.id,'feed').ok,false);assert.equal(s.coins,1800-cost);
  s.coins=0;b.clean=10;b.food=10;assert.equal(care(s,b.id,'feed').ok,false);assert.equal(care(s,b.id,'clean').ok,true);assert.equal(b.clean,100);assert.equal(b.food,10);
});
test('arriving guests pay once and car arrivals become coach arrivals too',()=>{
  const s=createGame();advance(s,125);assert.ok(s.stats.admissions>=6);assert.equal(s.stats.income,s.stats.admissions*ADMISSION);assert.equal(s.coins,1800+s.stats.income);assert.ok(s.events.some(e=>e.kind==='arrival'&&e.bus));
  for(const v of s.visitors)for(const p of v.route)if(p.c!==undefined)assert.ok(s.paths.includes(cellKey(p.c,p.r)));
});
test('facilities satisfy needs, generate sales, and conserve the economy',()=>{
  const s=createGame(),start=10000;s.coins=start;
  for(const [type,c] of [['food',7],['drink',8],['toilet',9],['gift',10]])assert.equal(buy(s,type,c,6).ok,true);
  let usedToilet=false;advance(s,220,()=>{usedToilet||=s.visitors.some(v=>v.bladder<15);});assert.ok(s.stats.sales>0);assert.ok(s.events.some(e=>e.kind==='income'&&e.source==='food'));assert.ok(s.events.some(e=>e.kind==='income'&&e.source==='drink'));assert.ok(s.events.some(e=>e.kind==='income'&&e.source==='gift'));assert.ok(usedToilet);assert.equal(s.coins,start-s.stats.spent+s.stats.income);assert.ok(s.stats.departures>0);assert.ok(s.visitors.length<40);
});
test('all nine animal pen types can be constructed and cared for',()=>{
  for(const [type,spec] of Object.entries(CATALOG).filter(([,spec])=>spec.kind==='pen')){
    const s=createGame();s.coins=10000;const result=buy(s,type,8,6);assert.equal(result.ok,true,type);advance(s,spec.buildTime+1);assert.equal(result.building.remaining,0);assert.ok(result.building.food<100);result.building.food=20;assert.equal(care(s,result.building.id,'feed').ok,true);
  }
});
test('habitat upgrades cost money, take time, and improve care efficiency',()=>{
  const s=createGame(),b=s.buildings[0];assert.equal(upgrade(s,b.id).ok,true);assert.equal(b.level,2);assert.ok(b.remaining>0);advance(s,7);const start=b.food;advance(s,10);assert.ok(start-b.food<1.9);assert.equal(upgrade(s,b.id).ok,true);assert.equal(b.level,3);advance(s,7);assert.equal(upgrade(s,b.id).ok,false);
});
test('pause freezes visitors, construction, food, timers and earnings',()=>{
  const s=createGame();buy(s,'food',7,6);advance(s,10);s.paused=true;const snapshot=JSON.stringify(s);advance(s,30);assert.equal(JSON.stringify(s),snapshot);
});
test('save round trip preserves the park without duplicating visitor income',()=>{
  const s=createGame();buy(s,'food',7,6);advance(s,40);const copy=restore(serialize(s));assert.ok(copy);assert.equal(copy.coins,s.coins);assert.deepEqual(copy.buildings,s.buildings);assert.deepEqual(copy.paths,s.paths);assert.equal(copy.visitors.length,0);assert.equal(copy.stats.income,s.stats.income);assert.equal(summary(copy).pens,1);
});
test('malformed saves and overlapping layouts are rejected',()=>{
  assert.equal(restore('{broken'),null);assert.equal(restore('{"version":99}'),null);const s=createGame(),data=JSON.parse(serialize(s));data.buildings.push({...data.buildings[0],id:'b2'});assert.equal(restore(JSON.stringify(data)),null);data.buildings=[{...s.buildings[0],type:'not-an-animal'}];assert.equal(restore(JSON.stringify(data)),null);
});
