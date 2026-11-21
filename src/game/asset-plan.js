import { CATALOG,VISITOR_KEYS } from './catalog.js';

export function buildingAssetKeys(type){
  const spec=CATALOG[type];if(!spec)return [];
  if(spec.kind==='station')return ['rail-model-straight','rail-model-platform','rail-model-entrance','rail-model-front','rail-model-car'];
  if(spec.kind==='rail')return [spec.railShape==='corner'?'rail-model-corner':'rail-model-straight'];
  if(type==='petting')return ['farm-cow','farm-sheep','farm-pig','shelter','hay','fence','gateFence'];
  if(spec.kind==='pen')return [['penguin','seal','crocodile','flamingo'].includes(type)?'pool':'sand','fence','gateFence','hay',spec.animal];
  return {food:['booth'],gift:['booth'],drink:['fountain'],toilet:['hut'],tree:['tree'],bench:['bench'],path:[]}[type]??[];
}
export function startupAssetKeys(state){
  return [...new Set(['entrance','tree','bench',...VISITOR_KEYS,...state.buildings.flatMap(b=>buildingAssetKeys(b.type))])];
}
