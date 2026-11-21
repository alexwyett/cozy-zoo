import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { VISITOR_KEYS } from './catalog.js';
import { VISITOR_SCALE } from './crowd.js';

// Kenney Mini Characters, CC0. Independent skeletons and mixers share geometry.
export function createVisitor(templates,style=0){
  const key=VISITOR_KEYS[((style%VISITOR_KEYS.length)+VISITOR_KEYS.length)%VISITOR_KEYS.length];
  const template=templates.get(key),root=new THREE.Group(),model=clone(template.scene);
  root.name=key;root.scale.setScalar(VISITOR_SCALE);root.add(model);
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
  model.scale.setScalar(1.12/size.y);model.position.y=-bounds.min.y*model.scale.y;
  const mixer=new THREE.AnimationMixer(model);
  const idle=mixer.clipAction(template.animations.find(c=>c.name==='idle'));
  const walk=mixer.clipAction(template.animations.find(c=>c.name==='walk'));
  const sit=mixer.clipAction(template.animations.find(c=>c.name==='sit'));
  idle.play();mixer.update((style%7)*.19);
  root.userData={mixer,idle,walk,sit,model,walking:false,mode:'idle',key};return root;
}
export function animateVisitor(root,dt,walking,seated=false){
  const data=root.userData,mode=seated?'sit':walking?'walk':'idle';
  if(mode!==data.mode){
    const previous=data[data.mode],next=data[mode];
    if(seated||data.mode==='sit'){data.mixer.stopAllAction();next.reset().play();}
    else{previous.fadeOut(.16);next.reset().fadeIn(.16).play();}
    data.walking=walking&&!seated;data.mode=mode;
  }
  data.mixer.update(dt);
}
