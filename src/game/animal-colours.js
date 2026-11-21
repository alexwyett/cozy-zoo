// Only coat materials change. Original materials and geometry stay shared;
// recoloured materials belong to one resident and are disposed with that resident.
const coats={
  penguin:{MAT_Dark:1},seal:{MAT_Fur_Grey:1},
  lion:{MAT_Fur_Tan:1,MAT_Fur_Brown:.5},
  giraffe:{MAT_Fur_Tan:1,MAT_Fur_Brown:.5,MAT_Orange:.8},
  elephant:{MAT_Stone_Grey:.85,MAT_Fur_Grey:1},
  panda:{MAT_White:1,MAT_Stone_Grey:.8},
  gorilla:{MAT_Fur_Grey:1,MAT_Stone_Grey:.7},
  crocodile:{MAT_Reptile_Green:1,MAT_Grass:.85},flamingo:{MAT_Pink:1},
  'farm-cow':{White:1},'farm-sheep':{White:1},'farm-pig':{'Material.003':1},
};
export function applyAnimalColour(root,species,color){
  if((root.userData.coatColour??null)===color)return;
  let coat=root.userData.coatMaterials;
  if(!coat){
    coat={bindings:[],variants:new Map()};const roles=coats[species]??{};
    root.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const originals=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      if(originals.some(material=>Object.hasOwn(roles,material.name)))coat.bindings.push({mesh,originals,array:Array.isArray(mesh.material)});
    });
    root.userData.coatMaterials=coat;
  }
  for(const {mesh,originals,array} of coat.bindings){
    const materials=originals.map(original=>{
      const shade=coats[species]?.[original.name];if(!color||shade===undefined)return original;
      if(!coat.variants.has(original))coat.variants.set(original,original.clone());
      const variant=coat.variants.get(original);variant.color.set(color).multiplyScalar(shade);return variant;
    });
    mesh.material=array?materials:materials[0];
  }
  root.userData.coatColour=color;
}
export function disposeAnimalColour(root){
  const coat=root.userData.coatMaterials;if(!coat)return;
  for(const {mesh,originals,array} of coat.bindings)mesh.material=array?originals:originals[0];
  for(const material of coat.variants.values())material.dispose();
  delete root.userData.coatMaterials;delete root.userData.coatColour;
}
