import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ASSETS,assetFile,CATALOG,COLS,ROWS,TILE,GROUND_WIDTH,ROAD,worldCell,gridCell,cellKey,normalizeRotation } from './catalog.js';
import { buildingAt } from './simulation.js';
import { pathMask,createPathTile } from './paths.js';
import { createVisitor,animateVisitor } from './visitors.js';
import { WORLD_BOUNDS,LAND_PLOTS,ownsPlot,ownsCell } from './land.js';
import { railwayStatus,buildRailRoute,railLayoutKey,pointOnRail,railPorts,RAIL_DIRECTIONS } from './railway.js';
import { isBridge,bridgeCells,pathNeighbors,visitorHeight } from './bridges.js';
import { createFootbridge } from './bridge-mesh.js';
import { VISITOR_SCALE } from './crowd.js';
import { residentRoster } from './residents.js';
import { applyAnimalColour,disposeAnimalColour } from './animal-colours.js';

const matCache=new Map();
const mat=color=>{if(!matCache.has(color))matCache.set(color,new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true}));return matCache.get(color);};
function cuboid(parent,x,y,z,w,h,d,color){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function ball(parent,x,y,z,r,color){const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;}
function batch(root){
  root.updateMatrixWorld(true);const groups=new Map();
  root.traverse(mesh=>{
    if(!mesh.isMesh||mesh.isSkinnedMesh||!mesh.visible)return;
    const m=mesh.material,key=m.name||m.uuid;
    if(!groups.has(key))groups.set(key,{material:m,geometries:[]});
    const geometry=mesh.geometry.clone();geometry.applyMatrix4(mesh.matrixWorld);
    for(const key of Object.keys(geometry.attributes))if(!['position','normal','color'].includes(key))geometry.deleteAttribute(key);
    groups.get(key).geometries.push(geometry);
  });
  const merged=new THREE.Group();
  for(const {material,geometries} of groups.values()){
    const geometry=mergeGeometries(geometries,false);if(!geometry)continue;
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;merged.add(mesh);geometries.forEach(g=>g.dispose());
  }
  return merged;
}
function disposeBatch(root){root?.traverse(n=>{if(n.isMesh)n.geometry.dispose();});}
function disposeBuilding(node){
  for(const animal of node.animals){animal.mixer.stopAllAction();animal.mixer.uncacheRoot(animal.mixer.getRoot());disposeAnimalColour(animal.root);node.root.remove(animal.root);}
  disposeBatch(node.root);node.root.traverse(n=>{if(n.isSprite){n.material.map?.dispose();n.material.dispose();}});
}
export class ZooWorld {
  constructor(canvas,onTap,renderer=null){
    this.canvas=canvas;this.onTap=onTap;this.templates=new Map();this.pendingAssets=new Map();this.loader=new GLTFLoader();this.buildings=new Map();this.guests=new Map();this.cars=new Map();this.target=new THREE.Vector3(-2.6,0,3.6);this.span=23;this.placement=null;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#dce8d5');
    this.renderer=renderer??new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.18;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.camera=new THREE.OrthographicCamera(-10,10,10,-10,0.1,160);
    this.scene.add(new THREE.HemisphereLight('#fffae9','#a0b18b',2.1));
    const sun=new THREE.DirectionalLight('#fff1d1',2.5);sun.position.set(-12,25,16);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:0.5,far:65});sun.shadow.bias=-0.001;sun.shadow.normalBias=0.035;this.scene.add(sun);
    cuboid(this.scene,0,-0.54,1,GROUND_WIDTH,0.2,70,'#c5d7b8');
    const frontage=new THREE.Group();
    cuboid(frontage,0,-0.05,ROAD.z,ROAD.width,0.10,3.0,'#899d93');
    for(const z of [10.5,14.3]){
      cuboid(frontage,0,.015,z,ROAD.width,.12,.8,'#d5d0b7');
      cuboid(frontage,0,.035,z===10.5?10.89:13.91,ROAD.width,.12,.06,'#e9e3cd');
    }
    cuboid(frontage,0,-.02,15.5,ROAD.width,.15,1.6,'#b3ca91');
    for(let x=-ROAD.width/2+1.5;x<ROAD.width/2;x+=3)cuboid(frontage,x,.012,ROAD.z,1.4,.015,.07,'#e9e6d1');
    this.scene.add(batch(frontage));disposeBatch(frontage);
    this.preview=new THREE.Group();this.scene.add(this.preview);
    this.grid=new THREE.GridHelper(48,24,'#91b294','#a5bea1');this.grid.position.set(0,0.29,-5);this.grid.visible=false;this.scene.add(this.grid);
    this.selection=new THREE.LineLoop(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#ffcf6d',depthTest:false}));this.selection.renderOrder=9;this.scene.add(this.selection);this.selection.visible=false;
    this.ray=new THREE.Raycaster();this.ground=new THREE.Plane(new THREE.Vector3(0,1,0),-0.15);this.bindInput();this.resize();window.addEventListener('resize',()=>this.resize());
  }
  async ensureAssets(keys,onProgress=()=>{}){
    const unique=[...new Set(keys)];let done=0,next=0,failed=false;
    const sizes=new Map(unique.map(key=>[key,globalThis.ZOO_ASSET_MANIFEST?.models[key]?.bytes??1])),loaded=new Map();
    const total=[...sizes.values()].reduce((sum,n)=>sum+n,0);
    const report=()=>{if(!failed)onProgress(unique.length ? .9*[...loaded.values()].reduce((sum,n)=>sum+n,0)/total+.1*done/unique.length : 1,{done,count:unique.length});};
    const run=async()=>{try{while(!failed&&next<unique.length){const key=unique[next++];await this.loadAsset(key,fraction=>{loaded.set(key,sizes.get(key)*fraction);report();});loaded.set(key,sizes.get(key));done++;report();}}catch(error){failed=true;throw error;}};
    report();await Promise.all(Array.from({length:Math.min(3,unique.length)},run));
  }
  async loadAsset(key,onProgress=()=>{}){
    if(!Object.hasOwn(ASSETS,key))throw new Error(`Unknown model: ${key}`);
    if(this.templates.has(key)){onProgress(1);return this.templates.get(key);}
    if(this.pendingAssets.has(key)){const result=await this.pendingAssets.get(key);onProgress(1);return result;}
    const task=(async()=>{
      let gltf;const embedded=globalThis.ZOO_ASSETS?.[key];
      if(embedded){const binary=atob(embedded),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);gltf=await this.loader.parseAsync(bytes.buffer,'');}
      else{
        const entry=globalThis.ZOO_ASSET_MANIFEST?.models[key],url=entry?.url??assetFile(key);
        gltf=await this.loader.loadAsync(new URL(url,document.baseURI).href,event=>{const total=entry?.bytes??event.total;if(total)onProgress(Math.min(.99,event.loaded/total));});
      }
      gltf.scene.traverse(node=>{if(node.name.startsWith('UCX_'))node.visible=false;if(node.isMesh){node.castShadow=true;node.receiveShadow=true;if(key.startsWith('farm-')){node.material.roughness=1;node.material.metalness=0;}}});
      this.templates.set(key,gltf);onProgress(1);return gltf;
    })();
    this.pendingAssets.set(key,task);
    try{return await task;}finally{this.pendingAssets.delete(key);}
  }
  async load(onProgress,keys=Object.keys(ASSETS)){
    await this.ensureAssets(keys,onProgress);
    const scenery=new THREE.Group();
    this.asset(scenery,'entrance',0,0.1,9.7,0,0.48);
    for(const [x,z,scale] of [[-24,-18,.72],[24,-18,.7],[-24,8,.6],[24,8,.62],[-24,-4,.7],[24,-4,.65]])this.asset(scenery,'tree',x,.15,z,0,scale);
    for(const x of [-36,-24,-12,12,24,36])this.asset(scenery,'tree',x,.055,15.5,0,.4);
    for(const x of [-20,-10,-5.5,5.5,10,20])this.asset(scenery,'bench',x,.075,10.5,0,.55);
    this.scene.add(batch(scenery));
  }
  asset(parent,key,x=0,y=0,z=0,angle=0,scale=0.5){
    const template=this.templates.get(key);if(!template)throw new Error(`Missing model: ${key}`);
    const node=clone(template.scene);node.position.set(x,y,z);node.rotation.y=angle;node.scale.setScalar(scale);parent.add(node);return node;
  }
  bridgePathCells(state){
    const bridges=[...state.buildings,...(this.strokeModels??[]).map(node=>node.bridge),this.placementModel?.bridge];
    return new Set(bridges.filter(isBridge).flatMap(b=>bridgeCells(b).map(p=>cellKey(p.c,p.r))));
  }
  rebuildGround(state,bridgePaths=this.bridgePathCells(state)){
    if(this.terrain){this.scene.remove(this.terrain);disposeBatch(this.terrain);}
    const ground=new THREE.Group(),paths=new Set(state.paths);
    for(const plot of LAND_PLOTS){
      const p=worldCell(plot.c,plot.r),x=p.x+plot.w-1,z=p.z+plot.h-1,owned=ownsPlot(state,plot);
      cuboid(ground,x,-.22,z,plot.w*TILE,.5,plot.h*TILE,owned?'#b5a781':'#b9bea3');
      if(!owned){
        cuboid(ground,x,.07,z,plot.w*TILE-.03,.14,plot.h*TILE-.03,'#b6c79a');
        for(const sx of [-1,1])for(const sz of [-1,1])cuboid(ground,x+sx*(plot.w-.16),.28,z+sz*(plot.h-.16),.09,.30,.09,'#d5c7a2');
      }
    }
    for(let c=WORLD_BOUNDS.minC;c<WORLD_BOUNDS.maxC;c++)for(let r=WORLD_BOUNDS.minR;r<WORLD_BOUNDS.maxR;r++){
      if(!ownsCell(state,c,r))continue;
      if(buildingAt(state,c,r)&&CATALOG[buildingAt(state,c,r).type].kind==='pen')continue;
      // The bridge replaces the pavement visually; its path cells still route guests.
      const p=worldCell(c,r),isPath=paths.has(cellKey(c,r))&&!bridgePaths.has(cellKey(c,r));
      if(isPath){const allowed=new Set(pathNeighbors(state,c,r).map(p=>cellKey(p.c,p.r))),tile=createPathTile(pathMask(paths,c,r,(x,y)=>allowed.has(cellKey(x,y))));tile.position.set(p.x,0,p.z);ground.add(tile);}
      else cuboid(ground,p.x,0.075,p.z,1.995,0.15,1.995,(c+r)%3===0?'#a4c77b':'#a9cc81');
    }
    this.terrain=batch(ground);disposeBatch(ground);this.scene.add(this.terrain);
  }
  makeBuilding(b){
    const spec=CATALOG[b.type],p=worldCell(b.c,b.r),cx=p.x+(spec.w-1),cz=p.z+(spec.h-1),root=new THREE.Group(),staticParts=new THREE.Group();root.position.set(cx,0,cz);const animals=[];
    const residents=residentRoster(b),homes=residents.length===1?[[0,0]]:residents.length===2?[[-.75,0],[.75,0]]:residents.length===3?[[-.85,-.55],[.85,-.55],[0,.8]]:residents.map((_,i)=>[Math.cos(i/residents.length*Math.PI*2)*1.03,Math.sin(i/residents.length*Math.PI*2)*1.03]);
    if(['rail','station'].includes(spec.kind)){
      this.asset(staticParts,spec.railShape==='corner'?'rail-model-corner':'rail-model-straight',0,.18,-1,0,.5);
      if(isBridge(b))staticParts.add(createFootbridge());
      if(spec.kind==='station'){
        this.asset(staticParts,'rail-model-platform',.63,.15,0,Math.PI/2,.65);
        this.asset(staticParts,'rail-model-entrance',.68,.35,.42,0,.4);
        const sign=this.sign('ZOO RAILWAY','#849b80');sign.position.set(.5,1.65,0);root.add(sign);
      }
    }else if(b.type==='petting'){
      cuboid(staticParts,0,.075,0,4,.15,4,'#aac87b');
      for(const x of [-1,1])for(const z of [-2,2])this.asset(staticParts,z===2&&x===-1?'gateFence':'fence',x,.15,z);
      for(const z of [-1,1])for(const x of [-2,2])this.asset(staticParts,'fence',x,.15,z,Math.PI/2);
      this.asset(staticParts,'shelter',-1.05,.15,-1.05,0,.22);this.asset(staticParts,'hay',-1.1,.15,1,0,.25);
      cuboid(staticParts,.8,.16,1.1,.75,.08,.6,'#be9d7c');
      const sign=this.sign('PETTING FARM','#b58960');sign.position.set(0,1.6,1.65);root.add(sign);
      if(!b.remaining||b.level>1)for(const [i,resident] of residents.entries()){
        const key=resident.species,[x,z]=homes[i],length={'farm-cow':1.15,'farm-sheep':.9,'farm-pig':.8}[key]*resident.scale;
        const wrapper=new THREE.Group(),model=this.asset(wrapper,key,0,0,0,0,1);model.updateMatrixWorld(true);model.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});
        const bounds=new THREE.Box3().setFromObject(model,true),size=bounds.getSize(new THREE.Vector3()),scale=length/Math.max(size.x,size.z),center=bounds.getCenter(new THREE.Vector3());
        model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);wrapper.position.set(x,.15,z);wrapper.name=resident.name;wrapper.userData.animalId=resident.id;root.add(wrapper);
        const mixer=new THREE.AnimationMixer(model),clips=this.templates.get(key).animations,idle=clips.find(c=>/\|Idle$/.test(c.name)),walk=clips.find(c=>/\|Walk$/.test(c.name));
        mixer.clipAction(idle).play();animals.push({root:wrapper,mixer,idle,walk:walk??idle,stationary:!walk,home:{x,z},range:.12,phase:i*2.6+b.c*.8,b});
      }
    }else if(spec.kind==='pen'){
      const water=['penguin','seal','crocodile','flamingo'].includes(b.type);
      for(const x of [-1,1])for(const z of [-1,1])this.asset(staticParts,water?'pool':'sand',x,0,z);
      for(const x of [-1,1])for(const z of [-2,2])this.asset(staticParts,z===2&&x===-1?'gateFence':'fence',x,0.15,z);
      for(const z of [-1,1])for(const x of [-2,2])this.asset(staticParts,'fence',x,0.15,z,Math.PI/2);
      if(water)cuboid(staticParts,-0.45,0.16,-0.15,2.8,0.18,2.3,b.type==='penguin'?'#e9ede0':'#c8c49b');
      else this.asset(staticParts,'hay',1.1,0.15,-1.1,0,0.3);
      if(!b.remaining||b.level>1){
        for(const [i,resident] of residents.entries()){
          const [x,z]=homes[i],model=this.asset(root,spec.animal,x,water?0.27:0.16,z,0,.48*resident.scale);model.name=resident.name;model.userData.animalId=resident.id;
          const mixer=new THREE.AnimationMixer(model),clips=this.templates.get(spec.animal).animations;
          const idle=clips.find(c=>/_Idle$/.test(c.name)),walk=clips.find(c=>/_(Walk|Waddle|Scoot|Crawl)$/.test(c.name));
          if(idle)mixer.clipAction(idle).play();animals.push({root:model,mixer,idle,walk,home:{x,z},range:residents.length>1?.10:.35,phase:i*2.6+b.c*0.8,b});
        }
      }
    }else if(['food','gift','drink','toilet'].includes(spec.kind)){
      if(b.type==='drink')this.asset(staticParts,'fountain',0,0.15,0,0,0.82);
      else if(b.type==='toilet')this.asset(staticParts,'hut',0,0.15,0,0,0.43);
      else this.asset(staticParts,'booth',0,0.15,0,0,0.43);
      const sign=this.sign({food:'SNACKS',gift:'GIFTS',drink:'LEMONADE',toilet:'WC'}[b.type],{food:'#c87d54',gift:'#947da6',drink:'#5a9c9e',toilet:'#709080'}[b.type]);
      sign.position.set(0,b.type==='drink'?1.45:2.05,0.4);root.add(sign);
    }else this.asset(staticParts,b.type,0,0.15,0,0,b.type==='tree'?0.62:0.7);
    root.add(batch(staticParts));
    if(b.remaining){
      const scaffold=new THREE.Group();for(const x of [-0.7,0.7])for(const z of [-0.7,0.7])cuboid(scaffold,x,0.8,z,0.09,1.5,0.09,'#d3a26e');
      cuboid(scaffold,0,1.4,0,1.8,0.1,1.8,'#e8c18b');root.add(batch(scaffold));
    }
    animals.forEach((animal,i)=>applyAnimalColour(animal.root,residents[i].species,residents[i].color));
    root.rotation.y=-normalizeRotation(b.rotation)*Math.PI/2;
    return {root,animals,version:`${b.type}:${b.level}:${b.remaining>0}`};
  }
  sign(label,color){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=80;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,256,80);ctx.fillStyle='#fff9e8';ctx.font='700 31px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,128,42);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true}));sprite.scale.set(1.7,0.53,1);return sprite;
  }
  sync(state){
    const railKey=railLayoutKey(state);
    if(railKey!==this.railKey){
      this.railKey=railKey;const status=railwayStatus(state);this.railRoute=buildRailRoute(status);this.railStation=status.station;
      if(!status.station&&this.railCars){for(const car of this.railCars)this.scene.remove(car);this.railCars=null;}
      if(status.station&&!this.railCars){this.railCars=['rail-model-front','rail-model-car'].map(key=>{const car=new THREE.Group();this.asset(car,key,0,0,0,0,.6);this.scene.add(car);return car;});}
    }
    const bridgePaths=this.bridgePathCells(state);
    const groundVersion=(state.land??[]).join(';')+'|'+state.paths.join(';')+'|'+state.buildings.map(b=>`${b.id}:${b.c},${b.r}:${b.type}:${isBridge(b)?b.rotation:''}`).join(';')+'|'+[...bridgePaths].sort().join(';');
    if(groundVersion!==this.groundVersion){this.groundVersion=groundVersion;this.rebuildGround(state,bridgePaths);}
    for(const [id,node] of this.buildings)if(!state.buildings.some(b=>b.id===id)){
      this.scene.remove(node.root);disposeBuilding(node);this.buildings.delete(id);
    }
    for(const b of state.buildings){
      const old=this.buildings.get(b.id),version=`${b.type}:${b.level}:${b.remaining>0}`;
      if(old?.version===version){old.root.rotation.y=-normalizeRotation(b.rotation)*Math.PI/2;const roster=residentRoster(b);old.animals.forEach((animal,i)=>{const resident=roster[i];if(resident){animal.root.name=resident.name;applyAnimalColour(animal.root,resident.species,resident.color);}});continue;}
      if(old){this.scene.remove(old.root);disposeBuilding(old);}
      const node=this.makeBuilding(b);this.buildings.set(b.id,node);this.scene.add(node.root);
    }
    for(const guest of state.visitors)if(!this.guests.has(guest.id)){const model=this.person(guest.color);this.guests.set(guest.id,model);this.scene.add(model);}
    for(const [id,node] of this.guests)if(!state.visitors.some(v=>v.id===id)){node.removeFromParent();node.userData.mixer.stopAllAction();node.userData.mixer.uncacheRoot(node.userData.model);this.guests.delete(id);}
    for(const car of state.vehicles)if(!this.cars.has(car.id)){const model=this.vehicle(car.kind,car.color);this.cars.set(car.id,model);this.scene.add(model);}
    for(const [id,node] of this.cars)if(!state.vehicles.some(v=>v.id===id)){this.scene.remove(node);node.traverse(n=>{if(n.isMesh)n.geometry.dispose();});this.cars.delete(id);}
  }
  person(color){
    return createVisitor(this.templates,color);
  }
  vehicle(kind,color){
    const root=new THREE.Group(),bus=kind==='bus',length=bus?3:1.65,palette=['#dcb568','#829faa','#a0b898','#c68a79'];
    cuboid(root,0,0.45,0,length,0.55,0.95,palette[color]);cuboid(root,bus?-0.1:-0.15,0.92,0,bus?2.7:0.95,0.53,0.86,bus?'#e6cc8d':palette[color]);
    for(const side of [-1,1]){
      if(bus)for(let x=-1.1;x<1.2;x+=0.48)cuboid(root,x,0.97,side*0.44,0.37,0.33,0.018,'#527d84');
      else cuboid(root,-0.14,0.97,side*0.44,0.75,0.32,0.018,'#527d84');
      for(const x of [-length*0.32,length*0.32]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.21,0.21,0.12,10),mat('#3e504d'));wheel.rotation.x=Math.PI/2;wheel.position.set(x,0.22,side*0.49);root.add(wheel);}
      cuboid(root,length/2+0.01,0.5,side*0.31,0.03,0.12,0.17,'#fff3b6');
    }
    return root;
  }
  update(state,dt){
    for(const b of this.buildings.values())for(const animal of b.animals){
      const t=state.time+animal.phase,moving=!animal.stationary&&Math.sin(t*0.16)>0.15;
      if(animal.moving!==moving){animal.mixer.stopAllAction();const clip=moving?animal.walk:animal.idle;if(clip)animal.mixer.clipAction(clip).reset().fadeIn(0.2).play();animal.moving=moving;}
      if(moving){animal.root.position.x=(animal.home?.x??0)+Math.sin(t*.32)*(animal.range??.60);animal.root.position.z=(animal.home?.z??0)+Math.cos(t*.32)*(animal.range??.44);animal.root.rotation.y=Math.atan2(Math.cos(t*.32)*.6,-Math.sin(t*.32)*.44);}
      animal.mixer.update(dt);
    }
    for(const v of state.visitors){
      const model=this.guests.get(v.id);if(!model)continue;
      const seat=v.stage==='riding'?(state.train?.passengers.indexOf(v.id)??-1):-1,car=seat>=0?this.railCars?.[Math.floor(seat/2)]:null;
      model.visible=v.stage!=='riding'||!!car;
      if(car){
        if(model.parent!==car)car.add(model);
        model.scale.setScalar(.30*VISITOR_SCALE);model.position.set(0,.20,seat%2===0?-.24:.12);model.rotation.y=Math.PI;
      }else{
        if(model.parent!==this.scene)this.scene.add(model);
        model.scale.setScalar(VISITOR_SCALE);const x=v.x,z=v.z;
        model.position.set(x,visitorHeight(state,x,z),z);model.rotation.y=v.heading??0;
      }
      animateVisitor(model,dt,v.moving??v.route.length>0,!!car);
    }
    if(this.railCars&&this.railStation){
      const station=this.railStation,p=worldCell(station.c,station.r),d=RAIL_DIRECTIONS[railPorts(station)[0]];
      this.railCars.forEach((car,i)=>{const distance=(state.train?.distance??0)-i*.86,at=this.railRoute?pointOnRail(this.railRoute,distance):{x:p.x-i*.86*d.dc,z:p.z-i*.86*d.dr,heading:Math.atan2(d.dc,d.dr)};car.visible=!station.remaining;car.position.set(at.x,.34,at.z);car.rotation.y=at.heading+Math.PI;});
    }
    for(const car of state.vehicles){const model=this.cars.get(car.id);model?.position.set(car.x,0,car.z);}
    this.renderer.render(this.scene,this.camera);
  }
  resize(){
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight;this.renderer.setSize(w,h,false);const aspect=w/Math.max(1,h);
    this.camera.left=-this.span*aspect/2;this.camera.right=this.span*aspect/2;this.camera.top=this.span/2;this.camera.bottom=-this.span/2;this.camera.updateProjectionMatrix();this.positionCamera();
  }
  positionCamera(){this.camera.position.copy(this.target).add(new THREE.Vector3(18,24,28));this.camera.lookAt(this.target);this.camera.updateMatrixWorld();}
  zoom(factor){this.span=THREE.MathUtils.clamp(this.span*factor,12,58);this.resize();}
  home(){this.target.set(-2.6,0,3.6);this.span=23;this.resize();}
  project(x,y,z){const p=new THREE.Vector3(x,y,z).project(this.camera);return {x:(p.x+1)*this.canvas.clientWidth/2,y:(1-p.y)*this.canvas.clientHeight/2,visible:p.x>-1.15&&p.x<1.15&&p.y>-1.1&&p.y<1.1};}
  groundPoint(x,y){const rect=this.canvas.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),this.camera);return this.ray.ray.intersectPlane(this.ground,new THREE.Vector3());}
  clearPreview(){this.preview.traverse(n=>{if(n.isMesh||n.isLine){n.geometry.dispose();n.material.dispose();}});this.preview.clear();}
  clearStroke(){for(const node of this.strokeModels??[]){this.scene.remove(node.root);disposeBuilding(node);}this.strokeModels=[];this.strokeKey=null;}
  showStroke(plan){
    const key=plan.ok+':'+plan.items.map(p=>`${p.type}:${p.c},${p.r}:${p.rotation}:${p.existing}`).join(';');if(key===this.strokeKey)return;
    this.clearStroke();this.clearPreview();this.clearPlacementModel();this.strokeKey=key;
    const bridgePaths=this.bridgePathCells(plan.temp??{buildings:[]});
    for(const item of plan.items){
      const p=worldCell(item.c,item.r),outline=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-.96,-.96],[.96,-.96],[.96,.96],[-.96,.96]].map(([x,z])=>new THREE.Vector3(p.x+x,.38,p.z+z))),new THREE.LineBasicMaterial({color:plan.ok?'#488562':'#c27861',depthTest:false}));outline.renderOrder=10;this.preview.add(outline);
      if(item.existing)continue;
      let node;
      if(item.type==='path'&&!item.bridge){if(bridgePaths.has(cellKey(item.c,item.r)))continue;const paths=new Set(plan.temp?.paths??[]),root=createPathTile(pathMask(paths,item.c,item.r));root.position.set(p.x,.015,p.z);node={root,animals:[]};}
      else if(item.bridge){const root=createFootbridge();root.position.set(p.x,0,p.z);root.rotation.y=-normalizeRotation(item.rotation)*Math.PI/2;node={root,animals:[]};}
      else node=this.makeBuilding({type:item.type,c:item.c,r:item.r,rotation:item.rotation,level:1,remaining:0});
      if(item.bridge||item.type==='rail-crossing')node.bridge={type:'rail-crossing',c:item.c,r:item.r,rotation:item.rotation};
      this.strokeModels.push(node);this.scene.add(node.root);
    }
  }
  clearPlacementModel(){if(this.placementModel){this.scene.remove(this.placementModel.root);disposeBuilding(this.placementModel);this.placementModel=null;}}
  setPlacement(type){this.placement=type;this.grid.visible=!!type;this.clearPreview();this.clearPlacementModel();this.clearStroke();if(!type)this.drawMode=false;}
  showPreview(type,c,r,valid,rotation=0){
    this.clearPreview();if(!type)return;const spec=CATALOG[type],p=worldCell(c,r),color=valid?'#6baf82':'#d18773';
    const bridge=type==='rail-crossing',horizontal=normalizeRotation(rotation)%2===0;
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(bridge&&horizontal?5.92:spec.w*TILE-0.08,0.1,bridge&&!horizontal?5.92:spec.h*TILE-0.08),new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.6,depthWrite:false}));mesh.position.set(p.x+(spec.w-1),0.35,p.z+(spec.h-1));this.preview.add(mesh);
    if(type!=='path'){
      if(this.placementModel?.type!==type){this.clearPlacementModel();this.placementModel={...this.makeBuilding({type,c:0,r:0,level:1,remaining:0}),type};this.scene.add(this.placementModel.root);}
      const root=this.placementModel.root;root.position.set(p.x+spec.w-1,0,p.z+spec.h-1);root.rotation.y=-normalizeRotation(rotation)*Math.PI/2;
      this.placementModel.bridge=bridge?{type:'rail-crossing',c,r,rotation}:null;
    }else this.clearPlacementModel();
  }
  showRemoval(c,r,result){
    this.clearPreview();const b=result.building,spec=b?CATALOG[b.type]:{w:1,h:1},p=worldCell(b?.c??c,b?.r??r);
    const bridge=isBridge(b),horizontal=normalizeRotation(b?.rotation)%2===0;
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(bridge&&horizontal?5.92:spec.w*TILE-.08,.12,bridge&&!horizontal?5.92:spec.h*TILE-.08),new THREE.MeshBasicMaterial({color:result.ok?'#dfab64':'#c47d72',transparent:true,opacity:.65,depthWrite:false}));mesh.position.set(p.x+spec.w-1,.35,p.z+spec.h-1);this.preview.add(mesh);
  }
  showLand(plot,valid){
    this.clearPreview();this.clearPlacementModel();if(!plot)return;
    const p=worldCell(plot.c,plot.r),mesh=new THREE.Mesh(new THREE.BoxGeometry(plot.w*TILE-.1,.08,plot.h*TILE-.1),new THREE.MeshBasicMaterial({color:valid?'#ecc477':'#ce9681',transparent:true,opacity:.48,depthWrite:false}));mesh.position.set(p.x+plot.w-1,.28,p.z+plot.h-1);this.preview.add(mesh);
  }
  select(b){
    if(!b){this.selection.visible=false;return;}
    const spec=CATALOG[b.type],p=worldCell(b.c,b.r),bridge=isBridge(b),horizontal=normalizeRotation(b.rotation)%2===0,x=p.x-(bridge&&horizontal?3:1),z=p.z-(bridge&&!horizontal?3:1),w=bridge&&horizontal?6:spec.w*TILE,h=bridge&&!horizontal?6:spec.h*TILE;
    this.selection.geometry.dispose();this.selection.geometry=new THREE.BufferGeometry().setFromPoints([[x,0.33,z],[x+w,0.33,z],[x+w,0.33,z+h],[x,0.33,z+h]].map(p=>new THREE.Vector3(...p)));this.selection.visible=true;
  }
  bindInput(){
    const pointers=new Map();let down=null,lastPinch=0,dragged=false,drawing=false,canDraw=false;
    const tile=e=>{const p=this.groundPoint(e.clientX,e.clientY);return p?gridCell(p.x,p.z):null;};
    this.canvas.addEventListener('pointerdown',e=>{
      this.canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pointers.size===1){down={x:e.clientX,y:e.clientY,cell:tile(e)};dragged=false;canDraw=this.drawMode&&!e.altKey&&(e.button??0)===0;}
      else{if(drawing)this.onDraw?.('cancel');drawing=false;canDraw=false;dragged=true;}
      lastPinch=0;
    });
    this.canvas.addEventListener('pointermove',e=>{
      const previous=pointers.get(e.pointerId);
      // A click/tap selects the tile. Hovering toward Build must not move it.
      if(!previous)return;
      const distance=Math.hypot(e.clientX-down.x,e.clientY-down.y);if(distance>6)dragged=true;
      if(dragged&&canDraw&&pointers.size===1){
        if(!drawing){drawing=true;this.onDraw?.('start',down.cell);}this.onDraw?.('move',tile(e));
      }else if(dragged){
        const a=this.groundPoint(previous.x,previous.y),b=this.groundPoint(e.clientX,e.clientY);
        if(a&&b){this.target.add(a.sub(b));this.target.x=THREE.MathUtils.clamp(this.target.x,-24,24);this.target.z=THREE.MathUtils.clamp(this.target.z,-20,11);this.positionCamera();}
      }
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(lastPinch)this.zoom(lastPinch/distance);lastPinch=distance;dragged=true;}
    });
    this.canvas.addEventListener('pointerup',e=>{if(drawing&&pointers.size===1){this.onDraw?.('end',tile(e));drawing=false;}else if(!dragged&&pointers.size===1){const p=tile(e);if(p)this.onTap(p);}pointers.delete(e.pointerId);if(!pointers.size)down=null;lastPinch=0;});
    this.canvas.addEventListener('pointercancel',()=>{if(drawing)this.onDraw?.('cancel');drawing=false;pointers.clear();down=null;lastPinch=0;dragged=true;});
    this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom(e.deltaY>0?1.08:0.92);},{passive:false});
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
  }
}
