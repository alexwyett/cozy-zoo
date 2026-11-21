import { createGame,buy,tick } from '../src/game/simulation.js';

// A small demonstration loop with a real crossing over the starter footpath.
export function railwayFixture(){
  const state=createGame();state.coins=10000;
  for(const [type,c,r,turn] of [
    ['station',10,7,1],['rail-corner',11,7,0],['rail-straight',11,6,0],
    ['rail-straight',11,5,0],['rail-corner',11,4,3],['rail-straight',10,4,1],
    ['rail-corner',9,4,2],['rail-crossing',9,5,0],['rail-straight',9,6,0],['rail-corner',9,7,1],
  ]){const result=buy(state,type,c,r,turn);if(!result.ok)throw new Error(`${type} ${c},${r}: ${result.reason}`);}
  for(let i=0;i<81;i++)tick(state,.1);
  return state;
}
