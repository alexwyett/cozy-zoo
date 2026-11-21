// Fixed coordinates keep existing parks, the entrance and road in place.
export const WORLD_BOUNDS={minC:-6,maxC:18,minR:-5,maxR:10};
export const LAND_PLOTS=[];
for(let y=-1;y<=1;y++)for(let x=-1;x<=2;x++)LAND_PLOTS.push({id:`plot:${x}:${y}`,x,y,c:x*6,r:y*5,w:6,h:5,starter:x>=0&&x<=1&&y>=0,name:`${y===-1?'North':y===0?'Upper':'Lower'} ${x===-1?'west meadow':x===2?'east meadow':x===0?'garden':'grove'}`});
export const plotAt=(c,r)=>LAND_PLOTS.find(p=>c>=p.c&&c<p.c+p.w&&r>=p.r&&r<p.r+p.h);
export const ownsPlot=(state,p)=>!!p&&(p.starter||(state.land??[]).includes(p.id));
export const ownsCell=(state,c,r)=>ownsPlot(state,plotAt(c,r));
export const adjoining=(state,p)=>LAND_PLOTS.some(q=>ownsPlot(state,q)&&Math.abs(p.x-q.x)+Math.abs(p.y-q.y)===1);
export const landPrice=state=>450+(state.land??[]).length*150;
export function canBuyLand(state,id){
  const plot=LAND_PLOTS.find(p=>p.id===id),price=landPrice(state);
  if(!plot)return {ok:false,price,reason:'Choose a meadow beside your zoo.'};
  if(ownsPlot(state,plot))return {ok:false,plot,price,reason:'You already own this land.'};
  if(!adjoining(state,plot))return {ok:false,plot,price,reason:'Buy an adjoining meadow first.'};
  if(state.coins<price)return {ok:false,plot,price,reason:`You need $${price-state.coins} more for this land.`};
  return {ok:true,plot,price,reason:`Unlock 30 building tiles for $${price}. Extend a path into your new meadow.`};
}
export function buyLand(state,id){
  const result=canBuyLand(state,id);if(!result.ok)return result;
  state.land??=[];state.land.push(id);state.coins-=result.price;state.stats.spent+=result.price;
  state.events.push({kind:'land',id});return result;
}
export function restoreLand(ids){
  if(ids===undefined)return [];
  if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.length>8)return null;
  const state={land:[]},pending=[...ids];
  while(pending.length){const i=pending.findIndex(id=>{const p=LAND_PLOTS.find(p=>p.id===id);return p&&!p.starter&&adjoining(state,p);});if(i<0)return null;state.land.push(pending.splice(i,1)[0]);}
  return [...ids];
}
