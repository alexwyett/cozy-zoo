import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame,buy,upgrade,tick,colourAnimal,renameAnimal,serialize,restore } from '../src/game/simulation.js';
import { ANIMAL_COLOURS,ensureResidents } from '../src/game/residents.js';
import { residentNamesHTML } from '../src/game/care-ui.js';
import { CATALOG } from '../src/game/catalog.js';
import { sceneFixture } from '../scripts/scene-fixture.mjs';
import { ZooUI } from '../src/game/ui.js';

const advance=(s,seconds)=>{for(let i=0;i<seconds*10;i++)tick(s,.1);};
test('individual coat colours persist through naming, upgrades and save round trips in every pen',()=>{
  for(const [type,spec] of Object.entries(CATALOG).filter(([,spec])=>spec.kind==='pen')){
    const s=createGame();s.coins=100000;const b=buy(s,type,8,6).building;advance(s,spec.buildTime+1);
    const id=b.animals[0].id,scale=b.animals[0].scale,coins=s.coins;
    assert.ok(colourAnimal(s,b.id,id,'#8DB7D4').ok);assert.equal(b.animals[0].color,'#8db7d4');assert.equal(s.coins,coins);
    renameAnimal(s,b.id,id,'Bluebell');assert.equal(b.animals[0].color,'#8db7d4');assert.equal(b.animals[0].scale,scale);
    upgrade(s,b.id);assert.equal(restore(serialize(s)).buildings.find(p=>p.id===b.id).animals[0].color,'#8db7d4');advance(s,7);
    assert.equal(b.animals[0].color,'#8db7d4');assert.equal(b.animals.at(-1).color,null,'new residents keep their natural coat');
    const loaded=restore(serialize(s)).buildings.find(p=>p.id===b.id);assert.deepEqual(loaded.animals,b.animals);
    assert.ok(colourAnimal(s,b.id,id,null).ok);assert.equal(b.animals[0].color,null);assert.equal(b.animals[0].name,'Bluebell');
  }
});

test('legacy and invalid imported colours fall back to Natural; invalid edits change nothing',()=>{
  const s=createGame(),b=s.buildings[0],id=b.animals[0].id;
  colourAnimal(s,b.id,id,'#123abc');const before=serialize(s);
  for(const color of ['red','#123','" onload="bad','#12345678',{},undefined])assert.equal(colourAnimal(s,b.id,id,color).ok,false);
  assert.equal(colourAnimal(s,b.id,'missing','#123abc').ok,false);assert.equal(colourAnimal(s,'missing',id,'#123abc').ok,false);assert.equal(serialize(s),before);
  const data=JSON.parse(before);delete data.buildings[0].animals[0].color;data.buildings[0].animals[1].color='url(bad)';
  assert.ok(restore(JSON.stringify(data)).buildings[0].animals.every(a=>a.color===null));
  assert.ok(colourAnimal(s,b.id,id,'').ok);assert.equal(b.animals[0].color,null);
});

test('all animal species recolour their own coat materials and preserve shared originals',async()=>{
  const world=await sceneFixture();
  const originals=new Map();for(const template of world.templates.values())template.scene.traverse(mesh=>{if(mesh.isMesh)originals.set(mesh.material,mesh.material.color.getHexString());});
  for(const [type,spec] of Object.entries(CATALOG).filter(([,spec])=>spec.kind==='pen')){
    const b=ensureResidents({id:'colour-'+type,type,c:0,r:0,level:3,remaining:0});b.animals.forEach(a=>a.color='#8db7d4');
    const node=world.makeBuilding(b);
    for(const animal of node.animals){
      const coat=animal.root.userData.coatMaterials;assert.ok(coat?.variants.size>0,`${animal.root.name} in ${type} has a coat to recolour`);
      for(const [original,variant] of coat.variants){assert.notEqual(variant,original);assert.notEqual(variant.color.getHexString(),original.color.getHexString());}
    }
    if(node.animals.length>1){const first=[...node.animals[0].root.userData.coatMaterials.variants.values()],second=[...node.animals[1].root.userData.coatMaterials.variants.values()];assert.ok(first.every(material=>!second.includes(material)));}
  }
  for(const [material,color] of originals)assert.equal(material.color.getHexString(),color,'template and scenery palettes stay untouched');
});

test('live recolouring preserves animation and markings; reset restores originals and upgrades dispose owned materials',async()=>{
  const world=await sceneFixture(),s=createGame(),b=s.buildings[0];world.sync(s);
  const animals=world.buildings.get(b.id).animals,first=animals[0],second=animals[1],mixer=first.mixer,originals=new Map(),other=new Map();
  first.root.traverse(mesh=>{if(mesh.isMesh)originals.set(mesh,mesh.material);});second.root.traverse(mesh=>{if(mesh.isMesh)other.set(mesh,mesh.material);});
  colourAnimal(s,b.id,b.animals[0].id,'#b39dcd');world.sync(s);
  assert.equal(world.buildings.get(b.id).animals[0],first);assert.equal(first.mixer,mixer);
  for(const [mesh,material] of originals){if(material.name!=='MAT_Dark')assert.equal(mesh.material,material,'belly, beak and other details retain their materials');}
  for(const [mesh,material] of other)assert.equal(mesh.material,material,'the next animal is not recoloured');
  const variants=[...first.root.userData.coatMaterials.variants.values()];
  colourAnimal(s,b.id,b.animals[0].id,null);world.sync(s);for(const [mesh,material] of originals)assert.equal(mesh.material,material);
  colourAnimal(s,b.id,b.animals[0].id,'#96bd9a');world.sync(s);assert.deepEqual([...first.root.userData.coatMaterials.variants.values()],variants,'reuse resident materials for later selections');
  let disposed=0,sourceDisposed=0;for(const material of variants)material.addEventListener('dispose',()=>disposed++);
  for(const material of new Set(originals.values()))material.addEventListener('dispose',()=>sourceDisposed++);
  s.coins=10000;upgrade(s,b.id);world.sync(s);assert.equal(disposed,variants.length);assert.equal(sourceDisposed,0);
  assert.equal(world.buildings.get(b.id).animals[0].root.userData.coatColour,'#96bd9a');
});

test('swatches and custom picker apply instantly without submitting names or replacing their fields',()=>{
  const previous=globalThis.document;
  try{
    const s=createGame(),b=s.buildings[0],a=b.animals[0],handlers=new Map();
    const fields=['Unsaved Pip','Unsaved Poppy'].map(value=>({value,setAttribute(){}}));
    const choices=ANIMAL_COLOURS.map(c=>({dataset:{action:'colour-animal',id:b.id,animalId:a.id,color:c.value??''},setAttribute(key,value){this[key]=value;}}));
    const caption={},picker={value:'#dfbb80',matches(selector){return selector==='.animal-colour-custom';},closest(){return group;}};
    const group={dataset:{pen:b.id,animal:a.id},setAttribute(){},querySelectorAll(){return choices;},querySelector(selector){return selector==='[data-colour-label]'?caption:picker;}};
    const forms=fields.map((input,i)=>({dataset:{pen:b.id,animal:b.animals[i].id},querySelector(selector){return selector==='.animal-colours'?(i===0?group:null):input;}}));
    globalThis.document={querySelector(){return {innerHTML:'',insertAdjacentHTML(){}};},querySelectorAll(selector){return selector==='.animal-name-form'?forms:[group];},addEventListener(name,fn){handlers.set(name,fn);}};
    let ui;ui=new ZooUI((action,data)=>{
      if(action==='rename-animal'){const result=renameAnimal(s,data.id,data.animalId,data.name);assert.ok(result.ok);ui.animalNameSaved(data.id,data.animalId,result.name);}
      else{assert.equal(action,'colour-animal');const result=colourAnimal(s,data.id,data.animalId,data.color);assert.ok(result.ok);ui.animalColourSaved(data.id,data.animalId,result.color);}
    });
    ui.renderPanel=()=>assert.fail('colour changes must not rebuild the name fields');
    const sky=choices.find(button=>button.dataset.color==='#8db7d4');handlers.get('click')({target:{closest(){return sky;}}});
    assert.equal(b.animals[0].color,'#8db7d4');assert.equal(sky['aria-pressed'],'true');assert.equal(caption.textContent,'Sky');
    picker.value='#456789';handlers.get('change')({target:picker});assert.equal(b.animals[0].color,'#456789');assert.ok(choices.every(button=>button['aria-pressed']==='false'));assert.equal(caption.textContent,'Custom #456789');
    handlers.get('click')({target:{closest(){return choices[0];}}});assert.equal(b.animals[0].color,null);assert.equal(choices[0]['aria-pressed'],'true');
    assert.deepEqual(fields.map(input=>input.value),['Unsaved Pip','Unsaved Poppy']);
    let prevented=false;handlers.get('submit')({target:{closest(){return forms[0];}},preventDefault(){prevented=true;}});
    assert.ok(prevented);assert.equal(b.animals[0].name,'Unsaved Pip');assert.equal(fields[1].value,'Unsaved Poppy');assert.notEqual(b.animals[1].name,'Unsaved Poppy');
    const html=residentNamesHTML(b);assert.equal((html.match(/type="color"/g)??[]).length,2);assert.ok(html.includes('Coat colour for'));
    assert.ok(html.includes('type="button" class="animal-colour-choice"'));assert.ok(html.includes('Natural restores the original coat'));
  }finally{globalThis.document=previous;}
});
