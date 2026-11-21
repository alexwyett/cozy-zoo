import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneFixture } from '../scripts/scene-fixture.mjs';
import { createGame,buy,tick } from '../src/game/simulation.js';
import { startupAssetKeys,buildingAssetKeys } from '../src/game/asset-plan.js';
import { ASSETS } from '../src/game/catalog.js';

test('starter loads only required models, then a lazy habitat builds and animates',async()=>{
  const s=createGame(),keys=startupAssetKeys(s),world=await sceneFixture(390,844,keys);world.sync(s);
  assert.ok(world.templates.size<Object.keys(ASSETS).length);assert.equal(world.templates.has('lion'),false);assert.equal(world.templates.has('farm-cow'),false);
  const progress=[];await world.ensureAssets(buildingAssetKeys('lion'),value=>progress.push(value));
  assert.equal(progress.at(-1),1);assert.ok(progress.every((p,i)=>p>=0&&p<=1&&(!i||p>=progress[i-1])));
  const result=buy(s,'lion',8,6);assert.ok(result.ok);world.sync(s);for(let i=0;i<150;i++)tick(s,.1);world.sync(s);world.update(s,.1);
  assert.equal(world.buildings.get(result.building.id).animals.length,1);
  await world.ensureAssets(buildingAssetKeys('petting'));const farm=world.makeBuilding({type:'petting',c:0,r:0,level:1,remaining:0});assert.equal(farm.animals.length,3);
});
test('overlapping model requests share a parse; failed loads can be retried',async()=>{
  const world=await sceneFixture(390,844,startupAssetKeys(createGame())),parse=world.loader.parseAsync.bind(world.loader);let calls=0;
  world.loader.parseAsync=async(...args)=>{calls++;return parse(...args);};
  const models=await Promise.all([world.loadAsset('lion'),world.loadAsset('lion'),world.loadAsset('lion')]);
  assert.equal(calls,1);assert.equal(models[0],models[1]);assert.equal(models[1],models[2]);
  world.loader.parseAsync=async()=>{throw new Error('Simulated interrupted model');};
  await assert.rejects(world.loadAsset('farm-cow'),/interrupted/);assert.equal(world.pendingAssets.has('farm-cow'),false);assert.equal(world.templates.has('farm-cow'),false);
  world.loader.parseAsync=parse;assert.ok(await world.loadAsset('farm-cow'));assert.equal(world.pendingAssets.size,0);
});

test('restored parks include all their habitat and facility dependencies at startup',async()=>{
  const state=createGame();state.coins=10000;buy(state,'petting',8,6);buy(state,'food',7,6);const keys=startupAssetKeys(state);
  for(const key of [...buildingAssetKeys('petting'),'booth'])assert.ok(keys.includes(key));
  const world=await sceneFixture(390,844,keys);for(let i=0;i<150;i++)tick(state,.1);world.sync(state);world.update(state,.1);assert.equal(world.buildings.size,state.buildings.length);
});
