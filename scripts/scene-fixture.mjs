import { readFile } from 'node:fs/promises';
import { ASSETS,assetFile } from '../src/game/catalog.js';
import { ZooWorld } from '../src/game/world.js';

// Scene-graph fixture, not a browser or WebGL emulator. It exercises the actual
// model loading, batching, camera and entity assembly without opening a port.
export async function sceneFixture(width=1600,height=1000,keys){
  globalThis.devicePixelRatio=1;
  globalThis.window={addEventListener(){}};
  globalThis.document={createElement(type){if(type!=='canvas')throw new Error('Unexpected element');return {width:0,height:0,getContext(){return {fillRect(){},fillText(){}};}};}};
  globalThis.ZOO_ASSETS={};
  for(const key of Object.keys(ASSETS))globalThis.ZOO_ASSETS[key]=(await readFile(new URL('../'+assetFile(key),import.meta.url))).toString('base64');
  const canvas={clientWidth:width,clientHeight:height,addEventListener(){},getBoundingClientRect(){return {left:0,top:0,width,height};}};
  const renderer={shadowMap:{},setPixelRatio(){},setSize(){},render(){}};
  const world=new ZooWorld(canvas,()=>{},renderer);await world.load(undefined,keys);return world;
}
