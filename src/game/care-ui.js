import { CATALOG } from './catalog.js';
import { attentionPens,residentRoster,ANIMAL_COLOURS } from './residents.js';

export const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const thumbnail=b=>globalThis.ZOO_THUMBNAILS?.[CATALOG[b.type].animal]??'';
export function careQueueKey(s,selected){return attentionPens(s).map(b=>b.id+':'+residentRoster(b).length).join('|')+':'+(selected??'')+':'+s.buildings.filter(b=>b.id===selected).map(b=>`${b.level}:${b.remaining>0}`).join();}
export function careQueueHTML(s,selected){
  const urgent=attentionPens(s),pens=[...urgent],current=s.buildings.find(b=>b.id===selected&&CATALOG[b.type].kind==='pen');
  if(current&&!pens.includes(current))pens.push(current);
  return `<section class="care-queue" data-care-queue data-key="${escapeHTML(careQueueKey(s,selected))}"><header><strong>Needs attention <span>${urgent.length}</span></strong><div><button class="icon-button" data-action="care-scroll" data-direction="-1" aria-label="Previous pen">&#8592;</button><button class="icon-button" data-action="care-scroll" data-direction="1" aria-label="Next pen">&#8594;</button></div></header>${pens.length?`<div class="care-strip" data-care-strip tabindex="0" role="region" aria-label="Pens needing food or cleaning">${pens.map(b=>{
    const spec=CATALOG[b.type],id=escapeHTML(b.id);return `<article class="care-card ${b.id===selected?'active':''}" data-care-id="${id}"><button class="care-card-select" data-action="select" data-id="${id}"><img src="${thumbnail(b)}" alt=""><span><strong>${spec.name}</strong><small>${residentRoster(b).length} residents</small><small data-care-values>Food ${Math.round(b.food)}% · Clean ${Math.round(b.clean)}%</small></span></button><div class="care-card-actions"><button class="secondary" data-action="feed" data-id="${id}" ${b.remaining||b.food>98||s.coins<spec.feedCost?'disabled':''}>Feed $${spec.feedCost}</button><button class="secondary" data-action="clean" data-id="${id}" ${b.remaining||b.clean>98?'disabled':''}>Clean</button></div></article>`;
  }).join('')}</div>`:'<p class="care-empty">All your animal homes are looking good.</p>'}</section>`;
}
export const animalColourLabel=color=>ANIMAL_COLOURS.find(choice=>choice.value===color)?.name??`Custom ${color}`;
export function residentColoursHTML(b,a){
  const id=escapeHTML(b.id),animalId=escapeHTML(a.id),pickerId=`colour-${id}-${animalId}`;
  return `<fieldset class="animal-colours" data-pen="${id}" data-animal="${animalId}" aria-label="Coat colour for ${escapeHTML(a.name)}"><legend>Coat colour <span data-colour-label>${escapeHTML(animalColourLabel(a.color))}</span></legend><div class="animal-colour-options">${ANIMAL_COLOURS.map(choice=>`<button type="button" class="animal-colour-choice" data-action="colour-animal" data-id="${id}" data-animal-id="${animalId}" data-color="${choice.value??''}" aria-label="${choice.name} coat colour" aria-pressed="${a.color===choice.value}"><i class="coat-swatch ${choice.value?'':'natural'}" ${choice.value?`style="background:${choice.value}"`:''} aria-hidden="true"></i><span>${choice.name}</span></button>`).join('')}<label class="animal-colour-picker" for="${pickerId}"><input id="${pickerId}" type="color" class="animal-colour-custom" value="${a.color??'#dfbb80'}" aria-label="Choose a custom coat colour"><span>Custom</span></label></div><small>Tap to apply. Natural restores the original coat.</small></fieldset>`;
}
export function residentNamesHTML(b){
  return `<section class="animal-residents"><h2>Meet your residents</h2><p>Give each animal a name and its own coat colour. Upgrades welcome one more resident.</p>${residentRoster(b).map(a=>{
    const id=escapeHTML(b.id),animalId=escapeHTML(a.id),inputId=`name-${id}-${animalId}`;
    return `<form class="animal-name-form" data-pen="${id}" data-animal="${animalId}"><label for="${inputId}">${escapeHTML(a.species.replace('farm-',''))} <small>${Math.round(a.scale*100)}% size</small></label><div><input id="${inputId}" name="animal-name" value="${escapeHTML(a.name)}" maxlength="24" required autocomplete="off" aria-label="Name for ${escapeHTML(a.name)}"><button type="submit" class="secondary">Save</button></div>${residentColoursHTML(b,a)}</form>`;
  }).join('')}</section>`;
}
