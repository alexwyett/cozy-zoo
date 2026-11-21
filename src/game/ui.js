import { CATALOG,worldCell,normalizeRotation } from './catalog.js';
import { summary,welfare,upgradePrice,approaches } from './simulation.js';
import { LAND_PLOTS,ownsPlot,adjoining,landPrice } from './land.js';
import { railwayStatus,isRail,railPorts,connectedRail } from './railway.js';
import { visitorConcern,residentRoster } from './residents.js';
import { careQueueHTML,careQueueKey,residentNamesHTML,animalColourLabel } from './care-ui.js';
const shapes={
  sad:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><path d="M8 17q4-5 8 0M7 6l3 1m4 0 3-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  bridge:'<path d="M2 17h20M5 17V5m14 12V5M5 8c4 6 10 6 14 0M9 12v5m6-5v5M2 21h5m10 0h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  train:'<rect x="5" y="2" width="14" height="17" rx="4"/><path d="M8 6h8v6H8Z" fill="#fff9e8"/><path d="m7 23 3-4m7 4-3-4" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="15" r="1" fill="#fff9e8"/><circle cx="15" cy="15" r="1" fill="#fff9e8"/>',
  track:'<path d="m7 2-3 20M17 2l3 20M6 5h12M5 10h14M5 15h14M4 20h16" fill="none" stroke="currentColor" stroke-width="2"/>',
  rotate:'<path d="M19 8a8 8 0 1 0 1 7M19 3v6h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  shovel:'<path d="m15 2 6 6-4 4-6-6Zm-2 6 3 3-7 7-3-3Zm-8 6 6 6-3 3H3v-5Z"/>',
  paw:'<ellipse cx="12" cy="16" rx="6" ry="4.5"/><circle cx="5.2" cy="9" r="2.6"/><circle cx="10" cy="5.7" r="2.6"/><circle cx="15.7" cy="6" r="2.6"/><circle cx="19.3" cy="10" r="2.6"/>',
  coin:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 7h-4a2.5 2.5 0 0 0 0 5h2a2.5 2.5 0 0 1 0 5H9m3-12v14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  leaf:'<path d="M20 3C7 1 1 9 6 16s15 0 14-13Z"/><path d="m5 21 9-12" fill="none" stroke="currentColor" stroke-width="2"/>',
  people:'<circle cx="9" cy="7" r="3"/><circle cx="18" cy="9" r="2.5"/><path d="M2 21v-4a7 7 0 0 1 14 0v4Zm15-7a5 5 0 0 1 6 5v2h-5Z"/>',
  smile:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="9" r="1.1"/><circle cx="15" cy="9" r="1.1"/><path d="M7.5 14a5 5 0 0 0 9 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  food:'<path d="M4 11a8 8 0 0 1 16 0Zm-1 3h18v3H3Zm1 5h16v3H4Z"/><path d="m6 12 3 2 3-2 3 2 3-2" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  drink:'<path d="M6 8h12l-2 14H8Z"/><path d="m12 9 2-7h5M5 6h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  toilet:'<path d="M7 3h6v8H7Zm-3 9h16a7 7 0 0 1-7 7h-1v3H8v-5a7 7 0 0 1-4-5Z"/>',
  gift:'<path d="M3 10h18v4H3Zm2 5h14v8H5Z"/><path d="M12 9C2 9 6-1 12 7c6-8 10 2 0 2Zm0 0v14" fill="none" stroke="currentColor" stroke-width="2"/>',
  clean:'<path d="m8 13 5-5 8 9-7 6Z"/><path d="m11 10 6-7m-2 17 3-3M3 4v5M.5 6.5h5M7 1v3M5.5 2.5h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  shop:'<path d="M3 10h18v12H3Zm-1-1 3-7h14l3 7Z"/><path d="M9 22V13h6v9" fill="none" stroke="#fff" stroke-width="1.5"/>',
  close:'<path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  plus:'<path d="M12 4v16M4 12h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  minus:'<path d="M4 12h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  home:'<path d="m2 11 10-9 10 9-3 0v11h-5v-7h-4v7H5V11Z"/>',
  pause:'<path d="M5 3h5v18H5Zm9 0h5v18h-5Z"/>',play:'<path d="m6 3 15 9L6 21Z"/>',
  sound:'<path d="M3 9h4l6-5v16l-6-5H3Z"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  muted:'<path d="M3 9h4l6-5v16l-6-5H3Z"/><path d="m17 9 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  help:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="17" r="1"/>',
  clock:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  arrow:'<path d="m8 4 8 8-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  path:'<path d="m6 2 4 0-2 20H2Zm8 0h4l4 20h-6Z"/>',
  tree:'<path d="m12 1 9 12h-5l5 6H3l5-6H3Zm-2 18h4v4h-4Z"/>',
  bench:'<path d="M2 4h20v4H2Zm1 6h18v4H3Zm-1 6h20v3H2Zm2 2h3v5H4Zm13 0h3v5h-3Z"/>',
  penguin:'<ellipse cx="12" cy="13" rx="7" ry="10"/><ellipse cx="12" cy="16" rx="4" ry="5" fill="#fff"/><circle cx="10" cy="8" r="1" fill="#fff"/><circle cx="14" cy="8" r="1" fill="#fff"/><path d="m10 10 2 3 2-3Z" fill="#e4af5b"/>',
  drop:'<path d="M12 1C10 5 3 12 3 16a9 9 0 0 0 18 0c0-4-7-11-9-15Z"/>',
};
export const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${shapes[name]??shapes.paw}</svg>`;
const money=n=>Math.floor(n).toLocaleString('en-GB');
const bar=(label,value,color,key)=>`<div class="meter"><div><span>${label}</span><b data-value="${key}">${Math.round(value)}%</b></div><div class="meter-track"><i data-meter="${key}" style="width:${value}%;background:${color}"></i></div></div>`;
export class ZooUI {
  constructor(onAction){
    this.onAction=onAction;this.panel=null;this.category='habitats';this.selected=null;this.pins=new Map();this.landPins=new Map();this.visitorPins=new Map();this.landMode=false;
    document.querySelector('#app').innerHTML=`
      <canvas id="zoo-canvas" aria-label="Your isometric zoo. Drag to explore and tap a habitat to care for its animals."></canvas>
      <div id="world-labels"></div><div id="income-effects" aria-hidden="true"></div>
      <header class="hud"><div class="topline"><div class="brand"><span class="brand-mark">${icon('paw')}</span><div><strong>Cozy Zoo</strong><span>A little wild. A lot of wonder.</span></div></div><div class="wallet">${icon('coin')}<strong id="coins">1,800</strong><small>coins</small></div></div>
      <div class="statline"><button data-action="guests" class="stat">${icon('people')}<b id="guests">0</b><span>guests</span></button><button data-action="guests" class="stat">${icon('smile')}<b id="happiness">100%</b><span>happy</span></button><span class="day-label">${icon('leaf')}<span id="day">Day 1</span><i class="live-dot"></i>Open</span></div></header>
      <div class="time-tools"><button data-action="sound" id="sound-toggle" aria-label="Mute sounds">${icon('sound')}</button><button data-action="speed" id="speed-toggle" aria-label="Change game speed">1×</button><button data-action="pause" id="pause-toggle" aria-label="Pause the zoo">${icon('pause')}</button></div>
      <aside class="keeper-note" id="keeper-note"><span class="note-icon">${icon('leaf')}</span><div><small>KEEPER'S NOTES</small><strong id="note-title">Welcome to your little zoo</strong><p id="note-body">Tap Penguin cove to feed your first residents.</p></div><button data-action="starter-care" aria-label="Care for the penguins">${icon('arrow')}</button></aside>
      <nav class="bottom-nav" aria-label="Zoo controls"><button data-action="home" class="nav-button" aria-label="Home: centre the zoo">${icon('home')}<span>Home</span></button><button data-action="shop" class="nav-button" aria-controls="panel" aria-expanded="false">${icon('shop')}<span>Shop</span></button><button data-action="care" class="nav-button" aria-controls="panel" aria-expanded="false">${icon('paw')}<span>Animals</span><i id="care-count" hidden>0</i></button><button data-action="guests" class="nav-button" aria-controls="panel" aria-expanded="false">${icon('people')}<span>Visitors</span></button><button data-action="remove-tool" class="nav-button" aria-label="Dig: remove paths and facilities" aria-pressed="false">${icon('shovel')}<span>Dig</span></button><button data-action="help" class="nav-button" aria-controls="panel" aria-expanded="false">${icon('help')}<span>Guide</span></button></nav>
      <section id="panel" class="sheet" hidden aria-label="Zoo management"><div class="sheet-grip"></div><div class="sheet-heading"><div><small id="panel-eyebrow">GROW YOUR ZOO</small><h1 id="panel-title">Zoo shop</h1></div><button data-action="close" class="icon-button" aria-label="Close panel">${icon('close')}</button></div><div id="panel-content" class="sheet-content"></div></section>
      <section id="placement" class="placement-card" hidden aria-label="Place a building"><div class="placement-copy"><small>MAKE IT YOURS</small><strong id="placement-title"></strong><p id="placement-message">Tap an empty space beside a path.</p></div><div class="placement-actions"><div class="nudge" aria-label="Adjust placement"><button data-action="nudge-left" aria-label="Move placement left">←</button><button data-action="nudge-up" aria-label="Move placement up">↑</button><button data-action="nudge-down" aria-label="Move placement down">↓</button><button data-action="nudge-right" aria-label="Move placement right">→</button></div><button data-action="rotate-place" class="secondary" id="rotate-place" aria-label="Rotate placement clockwise by 90 degrees">${icon('rotate')}Rotate 0°</button><button data-action="cancel-place" class="secondary">Cancel</button><button data-action="confirm-place" class="primary" id="confirm-place">Build</button></div></section>
      <div id="toast" class="toast" role="status" aria-live="polite"></div><div class="save-status" id="save-status">${icon('leaf')}Saved on this device</div>
      <div id="loading" class="loading"><div class="loading-card"><span class="loading-paw">${icon('paw')}</span><h1>A little world is waking up.</h1><p>Opening the gates to Cozy Zoo…</p><div class="loading-track"><i id="loading-progress"></i></div><small id="loading-caption">Gathering your first residents</small></div></div>`;
    document.querySelector('.placement-actions').insertAdjacentHTML('afterbegin','<button class="secondary" id="draw-toggle" data-action="draw-toggle" aria-pressed="false" hidden>Draw route</button><button class="secondary" id="undo-route" data-action="undo-route" hidden>Undo</button>');
    document.addEventListener('click',e=>{const button=e.target.closest('button[data-action]');if(button&&!button.disabled)this.onAction(button.dataset.action,button.dataset);});
    document.addEventListener('change',e=>{
      if(e.target.id==='import-save'&&e.target.files[0]){this.onAction('import-save',{file:e.target.files[0]});e.target.value='';}
      if(e.target.matches('.animal-colour-custom')){const group=e.target.closest('.animal-colours');this.onAction('colour-animal',{id:group.dataset.pen,animalId:group.dataset.animal,color:e.target.value});}
    });
    document.addEventListener('submit',e=>{const form=e.target.closest('.animal-name-form');if(form){e.preventDefault();this.onAction('rename-animal',{id:form.dataset.pen,animalId:form.dataset.animal,name:form.querySelector('[name="animal-name"]').value});}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')this.onAction('escape',{});});
  }
  thumbnail(key){return globalThis.ZOO_THUMBNAILS?.[key]??'';}
  assetLoading(visible,progress=0,label='your next addition'){
    let overlay=document.querySelector('#asset-loading');
    if(!overlay){overlay=document.createElement('div');overlay.id='asset-loading';overlay.className='loading';overlay.innerHTML=`<div class="loading-card"><span class="loading-paw">${icon('leaf')}</span><h1>A little more wonder.</h1><p id="asset-loading-caption"></p><div class="loading-track" role="progressbar" aria-label="Loading item" aria-valuemin="0" aria-valuemax="100"><i></i></div><button class="secondary" data-action="cancel-load">Cancel</button></div>`;document.querySelector('#app').append(overlay);}
    overlay.hidden=!visible;if(!visible)return;document.querySelector('#asset-loading-caption').textContent=`Opening ${label.toLowerCase()} · ${Math.round(progress*100)}%`;overlay.querySelector('.loading-track i').style.width=progress*100+'%';overlay.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',Math.round(progress*100));
  }
  landShop(state){return `<p class="shop-intro">Make room for more little adventures. Each meadow adds 30 building tiles. The next plot costs $${landPrice(state)}; later plots cost $150 more.</p><div class="land-summary">${icon('leaf')}<strong>${120+(state.land??[]).length*30} tiles owned</strong><span>${(state.land??[]).length} / 8 meadows added</span></div><div class="land-list">${LAND_PLOTS.filter(p=>!p.starter).map(p=>{const owned=ownsPlot(state,p),near=adjoining(state,p);return `<button class="land-offer" data-action="land-preview" data-id="${p.id}" ${owned||!near?'disabled':''}><span class="land-art">${icon('tree')}${icon('leaf')}</span><span><strong>${p.name}</strong><small>${owned?'Part of your zoo':near?'30 tiles · Tap to preview':'Buy a neighbouring meadow first'}</small></span><b data-land-price>${owned?'Owned':near?'$'+landPrice(state):'Locked'}</b></button>`;}).join('')}</div>`;}
  updateNavigation(){
    for(const button of document.querySelectorAll('.bottom-nav button')){
      const action=button.dataset.action,kind={shop:'shop',care:'care',guests:'guests',help:'help'}[action];
      if(kind)button.setAttribute('aria-expanded',this.panel===kind?'true':'false');
      if(action==='remove-tool')button.setAttribute('aria-pressed',this.editMode==='remove'?'true':'false');
    }
  }
  open(kind,state,id){this.panel=kind;this.selected=id??null;document.querySelector('#panel').hidden=false;this.renderPanel(state);this.updateNavigation();}
  close(){this.panel=null;document.querySelector('#panel').hidden=true;this.updateNavigation();}
  animalNameSaved(penId,animalId,name){
    // Keep the other name fields, their edits and the current focus intact.
    for(const form of document.querySelectorAll('.animal-name-form')){
      if(form.dataset.pen!==penId||form.dataset.animal!==animalId)continue;
      const input=form.querySelector('[name="animal-name"]');input.value=name;input.defaultValue=name;
      input.setAttribute('aria-label',`Name for ${name}`);
      form.querySelector('.animal-colours')?.setAttribute('aria-label',`Coat colour for ${name}`);
    }
  }
  animalColourSaved(penId,animalId,color){
    for(const group of document.querySelectorAll('.animal-colours')){
      if(group.dataset.pen!==penId||group.dataset.animal!==animalId)continue;
      for(const button of group.querySelectorAll('[data-color]'))button.setAttribute('aria-pressed',(button.dataset.color||null)===color?'true':'false');
      group.querySelector('[data-colour-label]').textContent=animalColourLabel(color);
      group.querySelector('.animal-colour-custom').value=color??'#dfbb80';
    }
  }
  renderPanel(state){
    const content=document.querySelector('#panel-content'),title=document.querySelector('#panel-title'),eyebrow=document.querySelector('#panel-eyebrow');
    const careScroll=content.querySelector('[data-care-strip]')?.scrollLeft??0;
    if(this.panel==='shop'){
      title.textContent='A little more zoo';eyebrow.textContent='GROW YOUR ZOO';
      content.innerHTML=`<div class="shop-tabs" role="group" aria-label="Shop categories">${[['habitats','Animal pens'],['facilities','Facilities'],['landscape','Paths & nature'],['railway','Railway'],['land','Land']].map(([id,name])=>`<button data-action="category" data-category="${id}" class="${this.category===id?'active':''}">${name}</button>`).join('')}</div><p class="shop-intro">${this.category==='habitats'?'A complete home, with animals included.':this.category==='facilities'?'Happy guests stay longer. Give them a little comfort.':this.category==='railway'?'Start with a station beside a path. Join straight and curved rails into a closed loop; Rotate aligns the ends. Use footbridges over footpaths; allow one ramp tile on each side.':'Connect your park, then add a little greenery.'}</p><button class="remove-tool-row" data-action="remove-tool">${icon('shovel')}<span><strong>Make a little space</strong><small>Remove paths or facilities. Recover half the base price.</small></span>${icon('arrow')}</button><div class="shop-grid">${Object.entries(CATALOG).filter(([,item])=>item.category===this.category).map(([type,item])=>`<button data-action="buy" data-type="${type}" class="shop-item" ${state.coins<item.price?'disabled':''}><span class="shop-art">${this.thumbnail(item.animal??({food:'booth',gift:'booth',toilet:'hut',drink:'fountain',path:'path'}[type]??type))?`<img src="${this.thumbnail(item.animal??({food:'booth',gift:'booth',toilet:'hut',drink:'fountain',path:'path'}[type]??type))}" alt="">`:icon(item.icon)}</span><strong>${item.name}</strong><span class="item-description">${item.description}</span><span class="price">${icon('coin')}${money(item.price)}<small>${item.crossing?'3 path tiles':item.w+' \u00d7 '+item.h+' tiles'}</small></span></button>`).join('')}</div>`;
    }else if(this.panel==='detail'){
      const b=state.buildings.find(b=>b.id===this.selected);if(!b){this.close();return;}const spec=CATALOG[b.type];title.textContent=spec.name;eyebrow.textContent=spec.kind==='pen'?'YOUR RESIDENTS':'YOUR PARK';
      content.innerHTML=`<div class="detail-hero"><img src="${this.thumbnail(spec.animal??({food:'booth',gift:'booth',toilet:'hut',drink:'fountain'}[b.type]??b.type))}" alt=""><div><span class="level-tag">Level ${b.level}</span><p>${spec.description}</p></div></div><p class="building-status" id="building-status"></p>${spec.kind==='pen'?`${bar('Food supply',b.food,'#d4b373','food')}${bar('Cleanliness',b.clean,'#80aa9a','clean')}<div class="care-actions"><button class="primary" data-action="feed" data-id="${b.id}">${icon('food')}Buy food <span>$${spec.feedCost}</span></button><button class="secondary" data-action="clean" data-id="${b.id}">${icon('clean')}Clean pen <span>Free</span></button></div><p class="detail-tip">Feeding and cleaning looks after everyone in this pen.</p>`:`<div class="facility-benefit">${icon(spec.icon)}<p>${spec.kind==='toilet'?'Guests can use these toilets for free.':spec.revenue?`Guests are served automatically. Each sale earns $${Math.round(spec.revenue*(1+(b.level-1)*0.15))}.`:spec.description}</p></div>`}${!['tree','bench'].includes(b.type)&&!isRail(b)?`<div class="upgrade-row"><div><strong>${b.level<3?'Make it even better':'All grown up'}</strong><span>${b.level<3?(spec.kind==='pen'?'One more resident joins when construction finishes.':'Improve your facility and its earning potential.'):'Maximum level reached.'}</span></div><button data-action="upgrade" data-id="${b.id}" class="secondary" id="upgrade-button" ${b.level>=3||b.remaining||state.coins<upgradePrice(b)?'disabled':''}>${b.level<3?'Upgrade $'+upgradePrice(b):'Level 3'}</button></div>`:''}`;
    }else if(this.panel==='care'){
      title.textContent='A little love goes a long way';eyebrow.textContent='ANIMAL CARE';
      content.innerHTML=`<p class="shop-intro">Tap a habitat to top up food or give it a clean.</p><div class="care-list">${state.buildings.filter(b=>CATALOG[b.type].kind==='pen').map(b=>`<button data-action="select" data-id="${b.id}"><img src="${this.thumbnail(CATALOG[b.type].animal)}" alt=""><span><strong>${CATALOG[b.type].name}</strong><small>${b.remaining?'Building…':`Food ${Math.round(b.food)}% · Clean ${Math.round(b.clean)}%`}</small></span><i class="${b.food<=35||b.clean<=40?'needs-care':''}">${b.food<=35?icon('food'):b.clean<=40?icon('clean'):icon('smile')}</i></button>`).join('')}</div>`;
    }else if(this.panel==='guests'){
      title.textContent='A lovely day out';eyebrow.textContent='YOUR VISITORS';const stats=summary(state);
      content.innerHTML=`<div class="guest-score">${icon('smile')}<strong id="guest-panel-happiness">${stats.happiness}%</strong><span>overall happiness</span></div><div class="need-list">${[['food','Hungry guests','hungry'],['drink','Thirsty guests','thirsty'],['toilet','Need the toilet','toilet']].map(([ico,label,key])=>`<div>${icon(ico)}<span>${label}</span><strong data-need="${key}">${stats[key]}</strong></div>`).join('')}</div><p class="detail-tip">Guests pay $12 at the gate. Connect snack shacks, lemonade stands and toilets to keep them comfortable. Gift shops earn a little extra.</p><button class="primary full" data-action="facilities">${icon('shop')}Build visitor facilities</button><div class="visitor-total"><span>Total admissions</span><strong>${state.stats.admissions}</strong><span>Shop &amp; ride sales</span><strong>${state.stats.sales}</strong><span>Railway riders</span><strong>${state.stats.rides??0}</strong><span>Total earned</span><strong>$${money(state.stats.income)}</strong></div>`;
    }else{
      title.textContent='Welcome, zoo keeper';eyebrow.textContent='A LITTLE FIELD GUIDE';
      content.innerHTML=`<div class="guide"><p>You have <strong>$1,800</strong> and a ready-built penguin cove. Make the zoo your own, one little addition at a time.</p><ol><li><strong>Look after your animals.</strong> The care scroller shows every pen needing food or cleaning, with quick Feed and Clean buttons. Swipe or use its arrows to move between pens. In pen details, name each resident and Save. Pick a coat swatch or a custom colour to give each animal its own look; colour choices save instantly and Natural restores the original coat. Each completed upgrade welcomes one more animal, with its own size and name. Floating bowl and brush icons show which pens need attention.</li><li><strong>Grow your park.</strong> Choose something in the Zoo shop, tap an empty space beside a path and press Build. Pens include their animals. Tap Rotate to turn the preview by 90 degrees before building, or rotate an existing object from its details. Rotation is free.</li><li><strong>All aboard.</strong> The Railway shop sells a station with a train ($350), straights ($25), curves ($30) and path bridges ($45). Rotate the pieces to join matching ends and close a loop back to the station. Up to four guests ride at once for $8 each. Close the ride from its station and wait for passengers to return before editing rails. Bridges include two ramp paths. Add a Garden path across existing straight track to create one automatically. Ramps run straight and need a level path at their ends.</li><li><strong>Buy a little more land.</strong> Open the Land tab in the Zoo shop, preview an adjoining meadow and confirm the purchase. Extend a path onto your 30 new tiles. The mini petting farm includes a cow, sheep and pig; feed and clean it like other pens.</li><li><strong>Draw paths and tracks.</strong> Choose a Garden path or railway piece, then drag across the map. Straights, curves and footbridges line up automatically. Review the whole route and total price, then press Build. Existing tiles are free. Drag back to erase part of a stroke, use Undo, or draw a new route. Two fingers pan and zoom; turn Draw off to pan with one finger and place individual tiles. Mouse users can also hold Alt or right-drag to pan.</li><li><strong>Reshape your paths.</strong> Path tiles join automatically into corners, T-junctions and crossings. Use the shovel to remove paths and facilities for half their base price. The entrance and routes still needed by guests or buildings stay protected.</li><li><strong>Keep guests smiling.</strong> Visitors become upset when they watch neglected animal homes. Icons over their heads show unhappiness, hunger, thirst or toilet needs. Add snacks, lemonade and toilets. Visitors find facilities automatically and pay when served.</li><li><strong>Watch the road.</strong> Cars and coaches bring visitors, then collect departing guests at the stop.</li></ol><p>Drag to explore. Pinch or scroll to zoom. Sound starts after your first tap. Your zoo saves automatically in this browser.</p><div class="save-transfer"><button class="secondary" data-action="export-save">Export zoo</button><button class="secondary" data-action="pick-save">Import zoo</button><input id="import-save" type="file" accept=".json,application/json" hidden></div><p>Import replaces this browser's current zoo. To move from the old file version, export your zoo from that file first.</p><p>Progress pauses when the tab is hidden. This starter prototype has no offline income.</p><small>Animal and scenery assets by Sandial. Visitors and railway by Kenney (Mini Characters and Coaster Kit, CC0). Farm animals by Quaternius (CC0). Road vehicles and connecting paths are original.</small></div>`;
    }
    if(this.panel==='detail'){const b=state.buildings.find(b=>b.id===this.selected);if(b&&CATALOG[b.type].kind!=='pen')content.insertAdjacentHTML('beforeend',`<button class="remove-facility" data-action="remove-tool" data-id="${b.id}">${icon('shovel')}Remove ${CATALOG[b.type].name.toLowerCase()}<span>Refund $${Math.floor(CATALOG[b.type].price/2)}</span></button>`);}
    if(this.panel==='detail'){
      const b=state.buildings.find(b=>b.id===this.selected);
      if(b?.type==='station')content.insertAdjacentHTML('beforeend',`<div class="upgrade-row"><div><strong>Railway operations</strong><span>Close the ride for track work. Passengers finish their lap first.</span></div><button class="secondary" data-action="toggle-railway" data-id="${b.id}">${b.closed?'Open ride':'Close ride'}</button></div>`);
      if(b)content.insertAdjacentHTML('beforeend',`<div class="rotation-row"><div><strong>Find the perfect angle</strong><small>Orientation ${normalizeRotation(b.rotation)*90}\u00b0</small></div><button class="secondary" data-action="rotate" data-id="${b.id}" aria-label="Rotate ${CATALOG[b.type].name} clockwise by 90 degrees">${icon('rotate')}Rotate 90\u00b0</button></div>`);
    }
    if(this.panel==='shop'&&this.category==='land')content.innerHTML=`<div class="shop-tabs" role="group" aria-label="Shop categories">${[['habitats','Animal pens'],['facilities','Facilities'],['landscape','Paths & nature'],['railway','Railway'],['land','Land']].map(([id,name])=>`<button data-action="category" data-category="${id}" class="${this.category===id?'active':''}">${name}</button>`).join('')}</div>`+this.landShop(state);
    if(this.panel==='shop')content.insertAdjacentHTML('beforeend','<button class="secondary save-help" data-action="help">Guide &amp; saved zoo</button>');
    if(this.panel==='detail'){
      const b=state.buildings.find(b=>b.id===this.selected);if(b&&CATALOG[b.type].kind==='pen'){content.insertAdjacentHTML('afterbegin',careQueueHTML(state,b.id));content.insertAdjacentHTML('beforeend',residentNamesHTML(b));}
    }else if(this.panel==='care')content.insertAdjacentHTML('afterbegin',careQueueHTML(state));
    const strip=content.querySelector('[data-care-strip]');if(strip)strip.scrollLeft=careScroll;
    this.refresh(state);
  }
  refresh(state){
    const stats=summary(state);document.querySelector('#coins').textContent=money(state.coins);document.querySelector('#guests').textContent=stats.guests;document.querySelector('#happiness').textContent=stats.happiness+'%';document.querySelector('#day').textContent='Day '+state.day;
    const care=document.querySelector('#care-count');care.hidden=!stats.alerts;care.textContent=stats.alerts;
    document.querySelector('#pause-toggle').innerHTML=icon(state.paused?'play':'pause');document.querySelector('#pause-toggle').setAttribute('aria-label',state.paused?'Resume the zoo':'Pause the zoo');
    const notes=state.stats.care<1?['A little care, a happy home','Tap Penguin cove to buy food and clean the pen.']:!state.buildings.some(b=>b.type==='food')?['A snack for the journey','A snack shack keeps hungry visitors smiling.']:stats.pens<2?['Make a little room for more','Choose your next animal pen in the Zoo shop.']:['Your little zoo is growing','Keep an eye on your animals and your guests.'];
    document.querySelector('#note-title').textContent=notes[0];document.querySelector('#note-body').textContent=notes[1];
    for(const button of document.querySelectorAll('.shop-item[data-type]'))button.disabled=state.coins<CATALOG[button.dataset.type].price;
    if(this.panel==='detail'){
      const b=state.buildings.find(b=>b.id===this.selected);if(!b)return;
      const status=document.querySelector('#building-status');
      if(b.remaining)status.textContent=`Making it lovely… ${Math.ceil(b.remaining)}s remaining`;
      else if(b.type==='station')status.textContent=(b.closed?(state.train?.passengers.length?'Closing after this lap.':'Closed for track work.'):railwayStatus(state).reason)+' \u00b7 '+(state.train?.passengers.length??0)+'/4 aboard \u00b7 $8 per guest';
      else if(b.levelCrossing)status.textContent='Older level crossing: clear a tile on each side, then remove and rebuild for a bridge.';
      else if(isRail(b))status.textContent=railPorts(b).filter(port=>connectedRail(state,b,port)).length+'/2 ends joined. Rotate to align the rails.';
      else if(!approaches(state,b).length)status.textContent='Connect a path so guests can reach this building.';
      else status.textContent=CATALOG[b.type].kind==='pen'?`${welfare(b)}% animal wellbeing · ${b.food<=35?'Food needed':b.clean<=40?'Time for a clean':'Looking good'}`:'Open and ready to welcome guests';
      for(const key of ['food','clean']){const value=document.querySelector(`[data-value="${key}"]`),meter=document.querySelector(`[data-meter="${key}"]`);if(value)value.textContent=Math.round(b[key])+'%';if(meter)meter.style.width=b[key]+'%';}
      const feed=document.querySelector('.care-actions [data-action="feed"]'),clean=document.querySelector('.care-actions [data-action="clean"]');if(feed)feed.disabled=b.remaining>0||b.food>98||state.coins<CATALOG[b.type].feedCost;if(clean)clean.disabled=b.remaining>0||b.clean>98;
      const upgrade=document.querySelector('#upgrade-button');if(upgrade)upgrade.disabled=b.level>=3||b.remaining>0||state.coins<upgradePrice(b);
    }
    const queue=document.querySelector('[data-care-queue]'),selected=this.panel==='detail'?this.selected:null;
    if(queue&&queue.dataset.key!==careQueueKey(state,selected)){const left=queue.querySelector('[data-care-strip]')?.scrollLeft??0;queue.outerHTML=careQueueHTML(state,selected);const strip=document.querySelector('[data-care-strip]');if(strip)strip.scrollLeft=left;}
    for(const card of document.querySelectorAll('[data-care-id]')){
      const b=state.buildings.find(b=>b.id===card.dataset.careId);if(!b)continue;
      card.querySelector('[data-care-values]').textContent=`Food ${Math.round(b.food)}% · Clean ${Math.round(b.clean)}%`;
      card.querySelector('[data-action="feed"]').disabled=b.remaining>0||b.food>98||state.coins<CATALOG[b.type].feedCost;card.querySelector('[data-action="clean"]').disabled=b.remaining>0||b.clean>98;
    }
    if(this.panel==='care')for(const button of document.querySelectorAll('.care-list button')){const b=state.buildings.find(b=>b.id===button.dataset.id);if(!b)continue;button.querySelector('small').textContent=b.remaining?'Building…':`${residentRoster(b).length} residents · Food ${Math.round(b.food)}% · Clean ${Math.round(b.clean)}%`;const marker=button.querySelector('i');marker.classList.toggle('needs-care',b.food<=35||b.clean<=40);marker.innerHTML=icon(b.food<=35?'food':b.clean<=40?'clean':'smile');}
    if(this.panel==='guests'){document.querySelector('#guest-panel-happiness').textContent=stats.happiness+'%';for(const key of ['hungry','thirsty','toilet'])document.querySelector(`[data-need="${key}"]`).textContent=stats[key];const totals=document.querySelectorAll('.visitor-total strong');[state.stats.admissions,state.stats.sales,state.stats.rides??0,'$'+money(state.stats.income)].forEach((value,i)=>totals[i].textContent=value);}
  }
  updatePins(state,world){
    this.updateVisitorPins(state,world);
    for(const plot of LAND_PLOTS.filter(p=>!p.starter)){
      let pin=this.landPins.get(plot.id);if(!pin){pin=document.createElement('button');pin.className='world-pin land-pin';pin.dataset.action='land-preview';pin.dataset.id=plot.id;pin.innerHTML=icon('plus')+'<span>Land</span>';pin.setAttribute('aria-label','Preview '+plot.name);document.querySelector('#world-labels').append(pin);this.landPins.set(plot.id,pin);}
      const p=worldCell(plot.c,plot.r),at=world.project(p.x+plot.w-1,.8,p.z+plot.h-1);pin.hidden=!(this.landMode||(this.panel==='shop'&&this.category==='land'))||ownsPlot(state,plot)||!adjoining(state,plot)||!at.visible;pin.style.transform=`translate(${at.x}px,${at.y}px) translate(-50%,-50%)`;
    }
    for(const [id,pin] of this.pins)if(!state.buildings.some(b=>b.id===id)){pin.remove();this.pins.delete(id);}
    for(const b of state.buildings){
      const spec=CATALOG[b.type];if(['tree','bench'].includes(spec.kind)||(spec.kind==='rail'&&b.type!=='rail-crossing'))continue;
      let pin=this.pins.get(b.id);if(!pin){pin=document.createElement('button');pin.className='world-pin';pin.dataset.action='select';pin.dataset.id=b.id;document.querySelector('#world-labels').append(pin);this.pins.set(b.id,pin);}
      const status=b.remaining?'clock':spec.kind==='pen'?(b.food<=35?'food':b.clean<=40?'clean':'paw'):spec.icon;
      const key=status+':'+Math.ceil(b.remaining)+':'+this.selected;if(pin.dataset.status!==key){pin.dataset.status=key;pin.innerHTML=icon(status)+(b.remaining?`<span>${Math.ceil(b.remaining)}s</span>`:'');pin.classList.toggle('warning',!b.remaining&&['food','clean'].includes(status));pin.classList.toggle('selected',this.selected===b.id);pin.setAttribute('aria-label',spec.name+(status==='food'?' needs food':status==='clean'?' needs cleaning':b.remaining?' is being built':' details'));}
      const p=worldCell(b.c,b.r),projected=world.project(p.x+(spec.w-1),spec.kind==='pen'?2.1:2.6,p.z+(spec.h-1));pin.hidden=!projected.visible;pin.style.transform=`translate(${projected.x}px,${projected.y}px) translate(-50%,-50%)`;
    }
  }
  updateVisitorPins(state,world){
    const active=new Set();
    for(const v of state.visitors){
      const concern=visitorConcern(state,v);if(!concern)continue;active.add(v.id);
      let pin=this.visitorPins.get(v.id);
      if(!pin){pin=document.createElement('div');pin.className='visitor-mood';pin.setAttribute('role','img');document.querySelector('#world-labels').append(pin);this.visitorPins.set(v.id,pin);}
      if(pin.dataset.mood!==concern.icon){pin.dataset.mood=concern.icon;pin.innerHTML=icon(concern.icon);}
      pin.setAttribute('aria-label',concern.label);pin.title=concern.label;
      const model=world.guests.get(v.id),at=world.project(v.x,(model?.position.y??.18)+1.15,v.z);pin.hidden=!at.visible;pin.style.transform=`translate(${at.x}px,${at.y}px) translate(-50%,-100%)`;
    }
    for(const [id,pin] of this.visitorPins)if(!active.has(id)){pin.remove();this.visitorPins.delete(id);}
  }
  routeMode(type,enabled){
    this.drawEnabled=enabled;const available=type==='path'||CATALOG[type]?.kind==='rail',button=document.querySelector('#draw-toggle');
    button.hidden=!available;button.textContent=enabled?'Draw: on':'Draw route';button.setAttribute('aria-pressed',String(enabled));document.querySelector('#undo-route').hidden=!enabled;
  }
  stroke(type,plan,rotation=0){
    this.placement(type,plan,rotation);const count=plan.count??plan.items.filter(p=>!p.existing).length;
    document.querySelector('#placement-title').textContent=type==='path'?'Draw garden paths':'Draw a railway';
    document.querySelector('#placement-message').textContent=plan.reason+' Drag to draw; two fingers pan. Turn Draw off to pan with one finger.';
    document.querySelector('#confirm-place').textContent=`Build ${count} · $${plan.cost}`;document.querySelector('#confirm-place').disabled=!plan.ok;
    document.querySelector('#rotate-place').hidden=type==='path'||plan.items.length>1;document.querySelector('#undo-route').disabled=plan.items.length<2;
  }
  placement(type,result,rotation=0){
    this.editMode=type;this.updateNavigation();
    this.landMode=type==='land';document.querySelector('#placement').hidden=!type;if(!type)return;
    document.querySelector('.nudge').hidden=type==='land'||this.drawEnabled;
    const rotateButton=document.querySelector('#rotate-place');rotateButton.hidden=['path','remove','land'].includes(type);rotateButton.innerHTML=icon('rotate')+`Rotate ${normalizeRotation(rotation)*90}\u00b0`;
    const card=document.querySelector('#placement');card.classList.toggle('removal',type==='remove');card.setAttribute('aria-label',type==='remove'?'Remove a path or facility':'Place a building');
    if(type==='land'){card.setAttribute('aria-label','Buy land');document.querySelector('#placement-title').textContent=result.plot?.name??'Grow your zoo';document.querySelector('#placement-message').textContent=result.reason;document.querySelector('#confirm-place').textContent=`Buy land $${result.price}`;document.querySelector('#confirm-place').disabled=!result.ok;return;}
    if(type==='remove'){document.querySelector('#placement-title').textContent=result.type?CATALOG[result.type].name:'Make a little space';document.querySelector('#placement-message').textContent=result.reason;document.querySelector('#confirm-place').textContent=result.ok?`Remove +$${result.refund}`:'Remove';document.querySelector('#confirm-place').disabled=!result.ok;return;}
    const spec=CATALOG[type];document.querySelector('#placement-title').textContent=spec.name;document.querySelector('#placement-message').textContent=result.reason;document.querySelector('#confirm-place').textContent=`Build $${spec.price}`;document.querySelector('#confirm-place').disabled=!result.ok;
  }
  toast(message){const node=document.querySelector('#toast');node.textContent=message;node.classList.add('visible');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>node.classList.remove('visible'),3500);}
  income(event,world){const p=world.project(event.x,2.1,event.z);if(!p.visible)return;const node=document.createElement('div');node.className='money-float';node.style.left=p.x+'px';node.style.top=p.y+'px';node.innerHTML=`<span>${icon('coin')}+${event.amount}</span>`;document.querySelector('#income-effects').append(node);setTimeout(()=>node.remove(),2000);}
}
