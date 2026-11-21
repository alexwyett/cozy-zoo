import { CATALOG } from './catalog.js';

const names=['Pip','Clover','Sunny','Pebble','Mochi','Willow','Biscuit','Maple','Poppy','Noodle','Olive','Bramble','Peanut','Fern','Mango','Daisy','Bean','Honey'];
const hash=text=>[...text].reduce((n,c)=>(Math.imul(n,31)+c.codePointAt(0))>>>0,5381);
export const ANIMAL_COLOURS=[
  {name:'Natural',value:null},{name:'Sand',value:'#dfbb80'},
  {name:'Cocoa',value:'#a77b64'},{name:'Coral',value:'#df9790'},
  {name:'Sage',value:'#96bd9a'},{name:'Sky',value:'#8db7d4'},
  {name:'Lilac',value:'#b39dcd'},
];
export const cleanAnimalColour=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():null;
export const needsCare=b=>CATALOG[b.type]?.kind==='pen'&&!b.remaining&&(b.food<=35||b.clean<=40);
export function residentCount(b){
  if(CATALOG[b.type]?.kind!=='pen')return 0;
  const base=b.type==='petting'?3:['penguin','flamingo'].includes(b.type)?2:1;
  const level=Math.max(1,(b.level??1)-(b.remaining>0&&b.level>1?1:0));return base+level-1;
}
export const cleanAnimalName=value=>typeof value==='string'?[...value.replace(/[\u0000-\u001f\u007f]/g,'').trim()].slice(0,24).join(''):'';
export function residentRoster(b){
  return Array.from({length:residentCount(b)},(_,index)=>{
    const old=b.animals?.[index],scale=Number.isFinite(old?.scale)?Math.max(.8,Math.min(1.08,old.scale)):[.84,.90,.98,1.04,1.08][(hash(`${b.id??b.type}:${b.type}`)+index*2)%5];
    return {id:'animal-'+(index+1),name:cleanAnimalName(old?.name)||names[(hash(b.id??b.type)+index)%names.length],scale,color:cleanAnimalColour(old?.color),species:b.type==='petting'?['farm-cow','farm-sheep','farm-pig'][index%3]:CATALOG[b.type].animal};
  });
}
export function ensureResidents(b){if(CATALOG[b.type]?.kind==='pen')b.animals=residentRoster(b);return b;}
export function attentionPens(s){return s.buildings.filter(needsCare).sort((a,b)=>Math.min(a.food,a.clean)-Math.min(b.food,b.clean));}
export function visitorConcern(s,v){
  if(!v.admitted||['waiting','toCar','riding'].includes(v.stage))return null;
  const needs=[['food',v.hunger??0,'Hungry'],['drink',v.thirst??0,'Thirsty'],['toilet',v.bladder??0,'Needs the toilet']].sort((a,b)=>b[1]-a[1]);
  if(needs[0][1]>=60)return {icon:needs[0][0],label:needs[0][2]};
  const pen=s.buildings.find(b=>b.id===v.welfareConcern?.penId);
  if(pen&&needsCare(pen)&&(v.stage==='watching'||v.welfareConcern.until>s.time))return {icon:'sad',label:pen.food<=35?'Upset that animals need food':'Upset that the animal pen needs cleaning'};
  return v.happiness<55?{icon:'sad',label:'Unhappy visitor'}:null;
}
