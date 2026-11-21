import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGame,buy,upgrade,care,renameAnimal,serialize,restore,tick } from '../src/game/simulation.js';
import { residentRoster,residentCount,attentionPens,visitorConcern } from '../src/game/residents.js';
import { careQueueHTML,careQueueKey,residentNamesHTML } from '../src/game/care-ui.js';
import { CATALOG,worldCell } from '../src/game/catalog.js';
import { sceneFixture } from '../scripts/scene-fixture.mjs';
import { ZooUI } from '../src/game/ui.js';

const advance=(s,seconds)=>{for(let i=0;i<seconds*10;i++)tick(s,.1);};
test('every pen gains one resident after each upgrade, with persistent names and sizes',()=>{
  for(const [type,spec] of Object.entries(CATALOG).filter(([,spec])=>spec.kind==='pen')){
    const s=createGame();s.coins=100000;const b=buy(s,type,8,6).building;advance(s,spec.buildTime+1);
    const base=residentCount(b),first=b.animals[0];assert.ok(renameAnimal(s,b.id,first.id,'  Pebble Jr.  ').ok);assert.equal(b.animals[0].name,'Pebble Jr.');
    for(let level=2;level<=3;level++){
      assert.ok(upgrade(s,b.id).ok);assert.equal(b.animals.length,base+level-2,'new resident waits for construction');assert.deepEqual(restore(serialize(s)).buildings.find(item=>item.id===b.id).animals,b.animals,'pending upgrade survives reload');advance(s,7);
      assert.equal(b.animals.length,base+level-1);assert.equal(b.animals[0].name,'Pebble Jr.');assert.equal(b.animals[0].scale,first.scale);
      assert.equal(new Set(b.animals.map(a=>a.id)).size,b.animals.length);assert.ok(b.animals.every(a=>a.scale>=.8&&a.scale<=1.08));
    }
    const loaded=restore(serialize(s)).buildings.find(item=>item.id===b.id);assert.deepEqual(loaded.animals,b.animals);
  }
});
test('older saves receive stable residents; names and imported sizes are validated',()=>{
  const s=createGame(),data=JSON.parse(serialize(s));delete data.buildings[0].animals;data.buildings[0].level=3;
  const old=restore(JSON.stringify(data)),again=restore(JSON.stringify(data));assert.equal(old.buildings[0].animals.length,4);assert.deepEqual(old.buildings[0].animals,again.buildings[0].animals);
  const b=old.buildings[0],id=b.animals[0].id;assert.equal(renameAnimal(old,b.id,id,'   ').ok,false);assert.equal(renameAnimal(old,b.id,'missing','Pip').ok,false);
  assert.ok(renameAnimal(old,b.id,id,'A'.repeat(100)).ok);assert.equal(b.animals[0].name.length,24);
  const malformed=JSON.parse(serialize(old));malformed.buildings[0].animals=[{id:'duplicate',name:12,scale:-100},{id:'duplicate',name:'\u0000Pip',scale:100}];
  const loaded=restore(JSON.stringify(malformed)).buildings[0];assert.equal(loaded.animals[0].scale,.8);assert.equal(loaded.animals[1].scale,1.08);assert.equal(loaded.animals[1].name,'Pip');assert.equal(new Set(loaded.animals.map(a=>a.id)).size,4);
});
test('attention scroller includes all urgent pens, quick care actions and escaped naming fields',()=>{
  const s=createGame();s.coins=10000;const penguin=s.buildings[0],lion=buy(s,'lion',8,6).building;advance(s,13);penguin.food=15;penguin.clean=20;lion.clean=25;lion.food=70;
  assert.deepEqual(attentionPens(s).map(b=>b.id),[penguin.id,lion.id]);const key=careQueueKey(s,penguin.id),html=careQueueHTML(s,penguin.id);
  assert.ok(html.includes('data-care-strip')&&html.includes('data-action="feed"')&&html.includes('data-action="clean"'));assert.ok(html.includes('Lion savanna')&&html.includes('Penguin cove'));
  assert.ok(care(s,penguin.id,'feed').ok);assert.ok(care(s,penguin.id,'clean').ok);assert.deepEqual(attentionPens(s).map(b=>b.id),[lion.id]);assert.notEqual(careQueueKey(s,penguin.id),key);
  renameAnimal(s,penguin.id,penguin.animals[0].id,'<Pip "&">');const form=residentNamesHTML(penguin);assert.ok(form.includes('&lt;Pip &quot;&amp;&quot;&gt;'));assert.ok(!form.includes('value="<Pip'));
  care(s,lion.id,'clean');assert.ok(careQueueHTML(s).includes('All your animal homes are looking good.'));
});
test('visitors react to neglected animals and show hunger, thirst, toilet and unhappy concerns',()=>{
  const s=createGame(),b=s.buildings[0],p=worldCell(3,8);s.nextArrival=10000;b.food=0;b.clean=0;
  const v={id:'v101',color:0,admitted:true,stage:'toPen',target:b.id,x:p.x,z:p.z,cell:{c:3,r:8},route:[],hunger:10,thirst:10,bladder:10,happiness:95,age:0,stay:500,visits:0,wallet:60};s.visitors=[v];tick(s,.1);
  assert.ok(v.happiness<90);assert.equal(visitorConcern(s,v).icon,'sad');const unhappy=v.happiness;advance(s,1);assert.ok(v.happiness<unhappy);
  care(s,b.id,'feed');care(s,b.id,'clean');assert.equal(visitorConcern(s,v),null);
  v.hunger=80;assert.equal(visitorConcern(s,v).icon,'food');v.thirst=90;assert.equal(visitorConcern(s,v).icon,'drink');v.bladder=95;assert.equal(visitorConcern(s,v).icon,'toilet');
  v.hunger=v.thirst=v.bladder=10;v.happiness=40;assert.equal(visitorConcern(s,v).icon,'sad');v.stage='riding';assert.equal(visitorConcern(s,v),null);
});
test('upgraded pens render their full roster with individual scales and independent animation rigs',async()=>{
  const world=await sceneFixture(),s=createGame();s.coins=10000;const b=s.buildings[0];renameAnimal(s,b.id,b.animals[0].id,'Pip');
  upgrade(s,b.id);world.sync(s);assert.equal(world.buildings.get(b.id).animals.length,2,'current residents remain during upgrades');advance(s,7);world.sync(s);
  const animals=world.buildings.get(b.id).animals;assert.equal(animals.length,3);assert.equal(animals[0].root.name,'Pip');assert.notEqual(animals[0].mixer,animals[1].mixer);assert.notEqual(animals[0].root.scale.x,animals[1].root.scale.x);
  const mixer=animals[0].mixer;renameAnimal(s,b.id,b.animals[0].id,'Poppy');world.sync(s);assert.equal(world.buildings.get(b.id).animals[0].mixer,mixer);assert.equal(animals[0].root.name,'Poppy');
  const farm=buy(s,'petting',8,6).building;advance(s,13);upgrade(s,farm.id);advance(s,7);upgrade(s,farm.id);advance(s,7);world.sync(s);assert.equal(world.buildings.get(farm.id).animals.length,5);
});
test('visitor head icons update and disappear when needs are satisfied or the guest leaves',()=>{
  const pins=[],documentBefore=globalThis.document;
  globalThis.document={createElement(){return {dataset:{},style:{},setAttribute(){},remove(){this.removed=true;}};},querySelector(){return {append(pin){pins.push(pin);}};}};
  try{
    const ui=Object.create(ZooUI.prototype);ui.visitorPins=new Map();const s=createGame(),v={id:'v123',admitted:true,stage:'watching',x:0,z:0,hunger:75,thirst:10,bladder:0,happiness:90};s.visitors=[v];
    const world={guests:new Map(),project(){return {x:10,y:20,visible:true};}};ui.updateVisitorPins(s,world);assert.equal(pins.length,1);assert.equal(pins[0].dataset.mood,'food');
    v.thirst=90;ui.updateVisitorPins(s,world);assert.equal(pins[0].dataset.mood,'drink');assert.equal(pins.length,1,'same pin is reused');
    v.thirst=v.hunger=10;ui.updateVisitorPins(s,world);assert.equal(ui.visitorPins.size,0);assert.ok(pins[0].removed);
  }finally{globalThis.document=documentBefore;}
});

test('saving either animal name keeps the other draft and field intact until its own Save',()=>{
  const documentBefore=globalThis.document;
  try{
    for(const order of [[0,1],[1,0]]){
      const s=createGame(),pen=s.buildings[0],original=pen.animals.map(a=>a.name);
      const fields=pen.animals.map((a,i)=>({value:['  Pebble  ','Pip & Poppy'][i],defaultValue:a.name,setAttribute(key,value){this[key]=value;}}));
      const forms=fields.map((input,i)=>({dataset:{pen:pen.id,animal:pen.animals[i].id},querySelector(selector){return selector==='.animal-colours'?null:input;}}));
      // Animal IDs repeat between pens; saving must target the matching pen too.
      const otherField={value:'Another pen draft',defaultValue:'Clover'};
      forms.push({dataset:{pen:'another-pen',animal:pen.animals[0].id},querySelector(){return otherField;}});
      globalThis.document={querySelectorAll(){return forms;}};
      const ui=Object.create(ZooUI.prototype),[first,second]=order;
      const saveName=i=>{
        const result=renameAnimal(s,pen.id,pen.animals[i].id,fields[i].value);assert.ok(result.ok);
        ui.animalNameSaved(pen.id,pen.animals[i].id,result.name);
      };
      saveName(first);
      assert.equal(fields[first].value,first===0?'Pebble':'Pip & Poppy');
      assert.equal(fields[first].defaultValue,fields[first].value);
      assert.equal(fields[second].value,second===0?'  Pebble  ':'Pip & Poppy','other edited value survives');
      assert.equal(fields[second].defaultValue,original[second],'other name remains unsaved');
      assert.equal(pen.animals[second].name,original[second]);
      assert.equal(forms[second].querySelector('input'),fields[second],'other input is not replaced');
      saveName(second);
      assert.deepEqual(restore(serialize(s)).buildings[0].animals.map(a=>a.name),['Pebble','Pip & Poppy']);
      assert.equal(fields[0]['aria-label'],'Name for Pebble');
      assert.equal(otherField.value,'Another pen draft');assert.equal(otherField.defaultValue,'Clover');
    }
  }finally{globalThis.document=documentBefore;}
});

test('world emotes stay inside a stacking context beneath desktop and mobile controls',async()=>{
  const css=await readFile(new URL('../src/game/game.css',import.meta.url),'utf8');
  const rules=[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  // Check the base rules: desktop needs the same protection as mobile media rules.
  const baseStyle=selector=>{
    const rule=rules.find(([,selectors])=>selectors.trim().split(',').includes(selector));
    assert.ok(rule,`Missing ${selector} rule`);
    return Object.fromEntries(rule[2].split(';').filter(Boolean).map(item=>item.split(':')));
  };
  const labels=baseStyle('#world-labels');assert.equal(labels.position,'absolute');assert.ok(Number.isFinite(Number(labels['z-index'])));
  for(const selector of ['.hud','.sheet','.bottom-nav','.time-tools','.keeper-note','.save-status','.placement-card','.toast']){
    assert.ok(Number(baseStyle(selector)['z-index'])>Number(labels['z-index']),`${selector} must paint above world emotes`);
  }
  assert.equal(labels['pointer-events'],'none');assert.equal(baseStyle('.visitor-mood')['pointer-events'],'none');
  assert.equal(baseStyle('.world-pin')['pointer-events'],'auto','habitat care pins remain interactive');
});
