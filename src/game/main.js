import { ZooUI,icon } from './ui.js';
import { createGame,restore,serialize,tick,buy,care,upgrade,rotate,toggleRailway,renameAnimal,colourAnimal,drainEvents,canPlace,canRemove,remove,buildingAt } from './simulation.js';
import { CATALOG,COLS,ROWS,worldCell } from './catalog.js';
import { WORLD_BOUNDS,LAND_PLOTS,plotAt,canBuyLand,buyLand } from './land.js';
import { buildingAssetKeys,startupAssetKeys } from './asset-plan.js';
import { canDraw,extendStroke,planStroke,buildStroke } from './draw-build.js';

const SAVE_KEY='pocket-zoo-starter-v1';let saved=null;try{saved=localStorage.getItem(SAVE_KEY);}catch{}
let state=restore(saved)||createGame(),world,placing=null,placementRequest=0,placementRotation=0,cell={c:8,r:6},selected=null,speed=1,sound=true,audio,lastSound=0;
let drawEnabled=false,stroke=[],strokeBefore=[];
const ui=new ZooUI(action);
document.querySelector('#boot-screen')?.remove();
function save(){try{localStorage.setItem(SAVE_KEY,serialize(state));document.querySelector('#save-status').innerHTML=icon('leaf')+'Saved on this device';}catch{document.querySelector('#save-status').textContent='Saving is unavailable in this browser';}}
function ching(){
  if(!sound||!audio||audio.state!=='running'||performance.now()-lastSound<100)return;lastSound=performance.now();
  [1046.5,1567.98].forEach((frequency,i)=>{const oscillator=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime+i*0.08;oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(0.055,t+0.008);gain.gain.exponentialRampToValueAtTime(0.001,t+0.25);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(t);oscillator.stop(t+0.28);});
}
function enableAudio(){try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
document.addEventListener('pointerdown',enableAudio,{once:true});document.addEventListener('keydown',enableAudio,{once:true});
function choose(id){cancel();selected=id;ui.selected=id;world.select(state.buildings.find(b=>b.id===id));ui.open('detail',state,id);}
function preview(next){
  if(!placing)return;
  if(drawEnabled&&canDraw(placing)){cell=next;stroke=[next];updateRoute();return;}
  if(placing==='land'){cell=next;const result=canBuyLand(state,plotAt(next.c,next.r)?.id);world.showLand(result.plot,result.ok);ui.placement('land',result);return;}
  const spec=CATALOG[placing]??{w:1,h:1};cell={c:Math.max(WORLD_BOUNDS.minC,Math.min(WORLD_BOUNDS.maxC-spec.w,next.c)),r:Math.max(WORLD_BOUNDS.minR,Math.min(WORLD_BOUNDS.maxR-spec.h,next.r))};
  const result=placing==='remove'?canRemove(state,cell.c,cell.r):canPlace(state,placing,cell.c,cell.r,placementRotation);
  if(placing==='remove')world.showRemoval(cell.c,cell.r,result);else world.showPreview(result.bridge?'rail-crossing':placing,cell.c,cell.r,result.ok,result.bridge?.rotation??placementRotation);ui.placement(placing,result,placementRotation);
}
function updateRoute(){if(!placing||!stroke.length)return;const plan=planStroke(state,placing,stroke,placementRotation);world.showStroke(plan);ui.stroke(placing,plan,placementRotation);}
function drawRoute(phase,p){
  if(!drawEnabled||!canDraw(placing))return;
  if(phase==='cancel'){stroke=strokeBefore;updateRoute();return;}
  if(!p)return;
  if(phase!=='start'&&stroke.at(-1)?.c===p.c&&stroke.at(-1)?.r===p.r)return;
  if(phase==='start'){strokeBefore=stroke;stroke=[p];}
  else stroke=extendStroke(stroke,p);
  cell=p;updateRoute();
}
function cancel(){placementRequest++;placing=null;drawEnabled=false;stroke=[];world.setPlacement(null);ui.routeMode(null,false);ui.placement(null);ui.assetLoading(false);}
async function action(name,data={}){
  if(!world)return;
  if(name==='shop'){cancel();ui.open('shop',state);}
  else if(name==='export-save'){
    const url=URL.createObjectURL(new Blob([serialize(state)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='pocket-zoo-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  else if(name==='pick-save')document.querySelector('#import-save').click();
  else if(name==='import-save'){
    try{const imported=restore(await data.file.text());if(!imported)throw new Error('Invalid zoo save');localStorage.setItem(SAVE_KEY,serialize(imported));state=imported;location.reload();}
    catch(error){console.error(error);ui.toast('This save could not be imported. Your current zoo has been kept.');}
  }
  else if(name==='category'){ui.category=data.category;ui.renderPanel(state);}
  else if(name==='land-preview'){
    const plot=LAND_PLOTS.find(p=>p.id===data.id);if(!plot)return;cancel();placing='land';selected=null;ui.selected=null;ui.close();world.select(null);world.setPlacement('land');preview({c:plot.c,r:plot.r});
    const p=worldCell(plot.c,plot.r);world.target.set(p.x+plot.w-1,0,p.z+plot.h-1);world.span=Math.max(30,world.span);world.resize();
  }
  else if(name==='facilities'){cancel();ui.category='facilities';ui.open('shop',state);}
  else if(name==='remove-tool'){
    if(placing==='remove'&&!data.id){cancel();return;}cancel();
    placing='remove';selected=null;ui.selected=null;ui.close();world.select(null);world.setPlacement(placing);
    const b=state.buildings.find(b=>b.id===data.id);preview(b?{c:b.c,r:b.r}:cell);ui.toast('Tap a path or facility, then confirm Remove.');
  }
  else if(name==='buy'){
    cancel();const request=placementRequest;ui.close();ui.assetLoading(true,0,CATALOG[data.type].name);
    const keys=CATALOG[data.type].kind==='rail'?[...new Set(['rail-straight','rail-corner','rail-crossing'].flatMap(buildingAssetKeys))]:buildingAssetKeys(data.type);
    try{await world.ensureAssets(keys,progress=>{if(request===placementRequest)ui.assetLoading(true,progress,CATALOG[data.type].name);});}
    catch(error){if(request===placementRequest){cancel();ui.open('shop',state);ui.toast('This item could not load. Check your connection and try again.');}console.error(error);return;}
    if(request!==placementRequest)return;ui.assetLoading(false);
    placing=data.type;placementRotation=0;selected=null;ui.selected=null;ui.close();world.select(null);world.setPlacement(placing);
    drawEnabled=canDraw(placing);world.drawMode=drawEnabled;ui.routeMode(placing,drawEnabled);
    let candidate=null;for(let r=WORLD_BOUNDS.maxR-1;r>=WORLD_BOUNDS.minR;r--)for(let c=WORLD_BOUNDS.minC;c<WORLD_BOUNDS.maxC;c++)for(let turn=0;turn<(CATALOG[placing].kind==='rail'?4:1);turn++)if(!candidate&&canPlace(state,placing,c,r,turn).ok){candidate={c,r};placementRotation=turn;}
    preview(candidate??cell);const focus=worldCell(cell.c,cell.r),spec=CATALOG[placing];world.target.set(focus.x+spec.w-1,0,focus.z+spec.h-1);world.positionCamera();ui.toast(drawEnabled?'Drag a route, review the price, then Build. Two fingers pan and zoom.':'Tap a space beside a path, then press Build.');
  }else if(name==='draw-toggle'){
    if(!canDraw(placing))return;drawEnabled=!drawEnabled;stroke=[];world.clearStroke();world.drawMode=drawEnabled;ui.routeMode(placing,drawEnabled);preview(cell);
  }else if(name==='undo-route'){
    if(drawEnabled&&stroke.length>1){stroke=stroke.slice(0,-1);cell=stroke.at(-1);updateRoute();}
  }else if(name==='rotate-place'){
    if(placing&&placing!=='remove'&&placing!=='path'&&placing!=='land'){placementRotation=(placementRotation+1)%4;if(drawEnabled)updateRoute();else preview(cell);}
  }else if(name==='toggle-railway'){
    const result=toggleRailway(state,data.id);if(result.ok){save();ui.renderPanel(state);ui.toast(result.closed?'Railway closing. Passengers will finish their lap before track work.':'Railway reopened. Complete the loop to welcome riders.');}
  }else if(name==='rotate'){
    const result=rotate(state,data.id);if(result.ok){world.sync(state);save();ui.renderPanel(state);ui.toast(`Rotated to ${result.rotation*90}\u00b0.`);}else ui.toast(result.reason);
  }else if(name.startsWith('nudge-')){const delta={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[name.slice(6)];if(delta)preview({c:cell.c+delta[0],r:cell.r+delta[1]});}
  else if(name==='confirm-place'){
    if(!placing)return;
    if(drawEnabled&&canDraw(placing)){
      const result=buildStroke(state,placing,stroke,placementRotation);if(!result.ok){ui.toast(result.reason);updateRoute();return;}
      world.clearStroke();world.clearPreview();world.sync(state);save();stroke=[];ui.refresh(state);ui.stroke(placing,{ok:false,items:[],cost:0,reason:'Route built. Drag another route to continue.'},placementRotation);ui.toast(`Built ${result.count} pieces for $${result.cost}.`);return;
    }
    if(placing==='land'){
      const result=buyLand(state,plotAt(cell.c,cell.r)?.id);if(!result.ok){ui.toast(result.reason);preview(cell);return;}
      world.sync(state);save();cancel();ui.refresh(state);ui.toast('Your meadow is open! Extend a path to start building.');return;
    }
    if(placing==='remove'){
      const result=remove(state,cell.c,cell.r);if(!result.ok){ui.toast(result.reason);preview(cell);return;}
      world.sync(state);save();ui.refresh(state);preview(cell);ui.toast(`${CATALOG[result.type].name} removed. Refunded $${result.refund}.`);return;
    }
    const type=placing,result=buy(state,type,cell.c,cell.r,placementRotation);if(!result.ok){ui.toast(result.reason);return;}
    world.sync(state);save();if(type==='path'||CATALOG[type].kind==='rail'){preview(cell);ui.toast(type==='path'?'Path added. Tap another space to keep building.':'Track added. Tap the next tile and Rotate to keep building.');}else{cancel();choose(result.building.id);ui.toast(`${CATALOG[type].name} is on its way.`);}
  }else if(name==='cancel-place'){cancel();}
  else if(name==='cancel-load'){cancel();ui.open('shop',state);}
  else if(name==='select'){const b=state.buildings.find(b=>b.id===data.id);if(placing==='remove'&&b)preview({c:b.c,r:b.r});else choose(data.id);}
  else if(name==='starter-care'){const pen=state.buildings.find(b=>CATALOG[b.type].kind==='pen');if(pen)choose(pen.id);}
  else if(name==='care-scroll'){document.querySelector('[data-care-strip]')?.scrollBy({left:Number(data.direction)*230,behavior:'smooth'});}
  else if(name==='rename-animal'){
    const result=renameAnimal(state,data.id,data.animalId,data.name);if(result.ok){save();world.sync(state);ui.animalNameSaved(data.id,data.animalId,result.name);ui.toast(`${result.name} is looking right at home.`);}else ui.toast(result.reason);
  }
  else if(name==='colour-animal'){
    const result=colourAnimal(state,data.id,data.animalId,data.color);if(result.ok){save();world.sync(state);ui.animalColourSaved(data.id,data.animalId,result.color);}else ui.toast(result.reason);
  }
  else if(name==='feed'||name==='clean'){
    const result=care(state,data.id,name);ui.toast(result.ok?(name==='feed'?'Fresh food, happy residents.':'All clean. Looking lovely!'):result.reason);if(result.ok){save();ui.renderPanel(state);}
  }else if(name==='upgrade'){const result=upgrade(state,data.id);ui.toast(result.ok?'A little upgrade is on its way.':result.reason);if(result.ok){world.sync(state);save();ui.renderPanel(state);}}
  else if(name==='care'||name==='guests'||name==='help'){cancel();ui.open(name,state);}
  else if(name==='close'){ui.close();world.select(null);selected=null;ui.selected=null;}
  else if(name==='escape'){if(placing)cancel();else{ui.close();world.select(null);}}
  else if(name==='pause'){state.paused=!state.paused;ui.refresh(state);}
  else if(name==='speed'){speed=speed===1?2:speed===2?3:1;document.querySelector('#speed-toggle').textContent=speed+'×';}
  else if(name==='sound'){sound=!sound;enableAudio();document.querySelector('#sound-toggle').innerHTML=icon(sound?'sound':'muted');document.querySelector('#sound-toggle').setAttribute('aria-label',sound?'Mute sounds':'Enable sounds');}
  else if(name==='home'){cancel();ui.close();world.select(null);selected=null;ui.selected=null;world.home();}
}
async function start(){
  try{
    const { ZooWorld }=await import('./world.js');
    world=new ZooWorld(document.querySelector('#zoo-canvas'),p=>{if(placing)preview(p);else{const b=buildingAt(state,p.c,p.r);if(b)choose(b.id);else{ui.close();world.select(null);selected=null;ui.selected=null;}}});
    world.onDraw=drawRoute;
    await world.load(progress=>{document.querySelector('#loading-progress').style.width=progress*100+'%';document.querySelector('#loading-caption').textContent=`Opening your zoo · ${Math.round(progress*100)}%`;},startupAssetKeys(state));
    world.sync(state);ui.refresh(state);document.querySelector('#loading').remove();
    let last=performance.now(),refresh=0,autosave=0;
    function frame(now){
      const elapsed=Math.min(0.1,(now-last)/1000);last=now;const dt=document.hidden||state.paused?0:elapsed*speed;
      if(dt>0){let remaining=dt;while(remaining>0){const step=Math.min(remaining,0.1);tick(state,step);remaining-=step;}}
      world.sync(state);world.update(state,dt);ui.updatePins(state,world);
      for(const event of drainEvents(state)){
        if(event.kind==='income'){ui.income(event,world);ching();}
        if(event.kind==='complete'){ui.toast(`${CATALOG[event.type].name} is ready!`);if(ui.panel==='detail'&&ui.selected===event.id)ui.renderPanel(state);}
      }
      refresh+=elapsed;autosave+=elapsed;if(refresh>0.25){ui.refresh(state);if(drawEnabled){if(stroke.length)updateRoute();}else if(['remove','land','rail-crossing','path'].includes(placing))preview(cell);refresh=0;}if(autosave>6){save();autosave=0;}
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
  }catch(error){console.error(error);document.querySelector('#loading-caption').textContent='Your zoo could not load. Check your connection, then retry.';document.querySelector('#loading .loading-card p').textContent='Your saved zoo is still on this device.';const retry=document.createElement('button');retry.className='primary';retry.textContent='Try again';retry.addEventListener('click',()=>location.reload());document.querySelector('#loading .loading-card').append(retry);}
}
start();
