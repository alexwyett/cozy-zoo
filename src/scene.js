import * as THREE from 'three';
import { PALETTE as C, group, box, ellipsoid, rod, shape, makeGiraffe, makeElephant, makePenguin } from './models.js';

function fence(parent, a, b, height = 0.61) {
  const count = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.85);
  for (let i = 0; i <= count; i++) {
    const t = i / count, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    box(parent, x, height / 2, z, 0.14, height, 0.14, C.woodLight, 0.025, 'fence_post');
  }
  for (const y of [height * 0.38, height * 0.81]) rod(parent, [a[0], y, a[1]], [b[0], y, b[1]], 0.045, C.wood, 0.045, 4, 'fence_rail');
}
function tree(parent, x, z, scale = 1, color = '#789e67') {
  const root = group(parent, 'acacia', x, 0, z); root.scale.setScalar(scale);
  rod(root, [0, 0, 0], [0.04, 1.8, 0], 0.14, '#a28058', 0.085);
  rod(root, [0, 1.1, 0], [-0.5, 1.75, 0.12], 0.08, '#a28058', 0.04);
  ellipsoid(root, -0.26, 1.88, 0, 2.0, 0.83, 1.65, color, 1);
  ellipsoid(root, 0.35, 2.09, -0.17, 1.5, 0.67, 1.45, '#91ad70', 1);
  ellipsoid(root, -0.65, 1.93, 0.24, 1.13, 0.61, 1.1, '#a7bf7e', 1);
}
function shrub(parent, x, z, scale = 1) {
  ellipsoid(parent, x, scale * 0.20, z, scale * 0.7, scale * 0.5, scale * 0.65, '#6e996a', 1);
  ellipsoid(parent, x + scale * 0.20, scale * 0.24, z, scale * 0.4, scale * 0.52, scale * 0.4, '#a1bd79', 1);
}
function stone(parent, x, z, scale = 1, color = '#b7beb1') {
  const mesh = ellipsoid(parent, x, scale * 0.26, z, scale * 0.91, scale * 0.60, scale * 0.79, color, 0, 'rock'); mesh.rotation.y = x * 0.7;
}
function grass(parent, x, z, scale = 1) {
  for (const i of [-1,0,1]) rod(parent, [x + i * 0.06, 0.04, z], [x + i * 0.14, scale * (0.24 - Math.abs(i) * 0.04), z + i * 0.06], 0.035, '#a4b47a', 0.004, 3, 'grass_tuft');
}
function bench(parent, x, z, angle = 0) {
  const root = group(parent, 'bench', x, 0, z); root.rotation.y = angle;
  for (const dx of [-0.43,0.43]) for (const dz of [-0.14,0.14]) box(root, dx, 0.16, dz, 0.065, 0.32, 0.065, '#6b8176', 0.01);
  for (const dz of [-0.15, 0, 0.15]) box(root, 0, 0.36, dz, 1.1, 0.09, 0.12, C.woodLight, 0.018);
  for (const y of [0.62,0.80]) box(root, 0, y, -0.19, 1.1, 0.13, 0.07, C.woodLight, 0.018);
  for (const dx of [-0.43,0.43]) box(root, dx, 0.56, -0.2, 0.06, 0.65, 0.06, '#6b8176', 0.01);
}
function person(parent, x, z, shirt, angle = 0, scale = 1) {
  const root = group(parent, 'visitor', x, 0, z); root.rotation.y = angle; root.scale.setScalar(scale);
  for (const s of [-1,1]) {
    box(root, s * 0.09, 0.22, 0, 0.12, 0.42, 0.15, '#536b6f', 0.035);
    box(root, s * 0.09, 0.05, 0.04, 0.13, 0.1, 0.21, '#f0e8d3', 0.025);
    rod(root, [s * 0.20,0.83,0], [s * 0.24,0.53,0.08], 0.055, shirt, 0.045);
  }
  box(root, 0, 0.68, 0, 0.35, 0.48, 0.24, shirt, 0.075);
  ellipsoid(root, 0, 1.05, 0, 0.31, 0.36, 0.29, '#d4a87a', 1);
  ellipsoid(root, 0, 1.18, -0.025, 0.34, 0.16, 0.31, '#735b47', 1);
}
function kiosk(parent, x, z) {
  const root = group(parent, 'welcome_kiosk', x, 0, z);
  box(root, 0, 0.68, 0, 1.8, 1.36, 1.5, '#f1dfb8', 0.09);
  box(root, 0, 0.85, 0.77, 1.45, 0.63, 0.08, '#4f7476', 0.035);
  box(root, 0, 0.51, 0.88, 1.75, 0.13, 0.40, C.woodLight, 0.035);
  box(root, 0, 1.46, 0, 2.2, 0.22, 1.9, '#6f9d83', 0.065);
  const roof = shape(root, new THREE.ConeGeometry(1.60, 0.62, 4), '#7ca78a', 0, 1.86, 0, 'roof'); roof.rotation.y = Math.PI / 4;
  box(root, 0, 1.53, 0.99, 0.69, 0.31, 0.08, '#f9efd8', 0.04);
  // Small paw emblem built from geometry, not a texture.
  ellipsoid(root, 0, 1.50, 1.045, 0.18, 0.13, 0.025, '#729885', 1);
  for (const dx of [-0.09,0,0.09]) ellipsoid(root, dx, 1.60 + (dx === 0 ? 0.025 : 0), 1.045, 0.055, 0.06, 0.025, '#729885', 1);
}

export function makeZoo() {
  const root = new THREE.Group(); root.name = 'Pocket_Zoo_Art_Test';
  const base = box(root, 0, -0.41, 0, 15.4, 0.75, 12.0, C.earth, 0.29, 'earth_plinth');
  box(root, 0, -0.055, 0, 15.4, 0.18, 12.0, C.grass, 0.12, 'grass_surface');
  // Paths keep the three species in visibly distinct spaces.
  box(root, 0.05, 0.035, 0.22, 1.23, 0.08, 10.65, '#e7d9b8', 0.035, 'main_path');
  box(root, 0, 0.04, 1.10, 14.6, 0.09, 1.18, '#e7d9b8', 0.035, 'cross_path');
  box(root, -3.75, 0.045, 3.55, 5.6, 0.09, 3.65, '#e7d9b8', 0.10, 'entrance_plaza');
  for (const x of [-5.9,-4.8,-3.7,-2.6,-1.5,1.3,2.4,3.5,4.6,5.7]) box(root, x, 0.092, 1.10, 0.025, 0.009, 1.1, '#d9c8a8', 0);
  box(root, -3.55, 0.045, -2.37, 5.65, 0.09, 5.35, C.sand, 0.18, 'giraffe_sand');
  box(root, 3.70, 0.045, -2.37, 5.65, 0.09, 5.35, '#b8c48c', 0.18, 'elephant_grass');
  for (const [left,right] of [[-6.4,-0.75],[0.85,6.5]]) {
    fence(root, [left,-5.04],[right,-5.04]); fence(root,[left,-5.04],[left,0.27]);
    fence(root,[right,-5.04],[right,0.27]); fence(root,[left,0.27],[right,0.27]);
  }
  const giraffe = makeGiraffe(); giraffe.position.set(-3.3,0.10,-2.0); giraffe.rotation.y = -0.18; root.add(giraffe);
  const elephant = makeElephant(); elephant.position.set(3.45,0.10,-2.0); elephant.rotation.y = -0.08; root.add(elephant);
  tree(root,-5.25,-3.6,1.13); tree(root,5.55,-4.10,1.05); tree(root,-6.65,3.6,0.93);
  for (const [x,z,s] of [[-5.5,-1.1,0.7],[-1.3,-4.2,0.8],[5.6,-0.7,0.95],[1.6,-4.2,0.6],[-6.3,-4.3,0.7]]) { stone(root,x,z,s); shrub(root,x+0.35,z-0.2,s); }
  for (const [x,z] of [[-5.3,-2.3],[-2.0,-4.3],[-1.4,-1.4],[5.1,-3.1],[2.3,-3.9],[5.7,-1.6]]) grass(root,x,z,1.3);
  // Flat-sided pool and pale rocks distinguish the penguin habitat.
  box(root, 3.65, 0.06, 3.72, 5.65, 0.14, 3.60, '#c9d9cf', 0.24, 'polar_kerb');
  box(root, 3.65, 0.15, 3.72, 5.27, 0.11, 3.20, C.water, 0.22, 'pool');
  box(root, 2.42, 0.24, 3.30, 2.7, 0.20, 2.31, '#e5e9dc', 0.26, 'penguin_island');
  const penguin = makePenguin(); penguin.position.set(2.27,0.34,3.27); penguin.rotation.y = 0.28; root.add(penguin);
  const chick = makePenguin(); chick.scale.setScalar(0.65); chick.position.set(3.12,0.34,2.90); chick.rotation.y = -0.3; chick.name = 'Penguin_chick'; root.add(chick);
  for (const [x,z,s] of [[5.60,4.40,0.95],[5.83,3.73,0.7],[4.9,4.95,0.8],[1.5,4.55,0.7]]) stone(root,x,z,s,'#dce4d8');
  box(root, 4.75, 0.22, 2.90, 0.77, 0.10, 0.54, '#e9eee1', 0.09, 'ice_floe').rotation.y = 0.34;
  for (const [x,z] of [[4.45,4.25],[5.22,3.21],[3.85,4.85]]) {
    const ripple = shape(root, new THREE.TorusGeometry(0.23,0.014,3,24), '#b4d9da', x,0.215,z,'water_ripple'); ripple.rotation.x = -Math.PI/2;
  }
  fence(root,[0.82,2.0],[6.48,2.0],0.48); fence(root,[6.48,2.0],[6.48,5.45],0.48);
  kiosk(root,-4.60,3.62); bench(root,-1.9,2.7,Math.PI/2); bench(root,-2.5,5.2);
  person(root,-0.05,1.35,'#cc8c6e',0.55); person(root,-0.30,2.17,'#e4b85a',0.65,0.8);
  person(root,1.40,1.18,'#819cae',-0.6); person(root,-3.4,4.65,'#a4b88b',-0.5);
  for (const [x,z] of [[-7.0,-1.0],[-7.0,0.1],[-5.9,5.25],[6.95,-2.0],[6.95,-3.1],[-1.2,5.25]]) shrub(root,x,z,0.75);
  const bin = group(root,'bin',-1.07,0,3.08); box(bin,0,0.28,0,0.32,0.56,0.32,'#789789',0.035); box(bin,0,0.59,0,0.38,0.08,0.38,'#59776d',0.025);
  root.userData = { purpose: 'Original art study; no gameplay or habitat simulation', camera: 'fixed orthographic', palette: 'warm natural pastels' };
  return root;
}

export function makeCamera(aspect = 1.2, span = 21) {
  const camera = new THREE.OrthographicCamera(-span * aspect / 2, span * aspect / 2, span / 2, -span / 2, 0.1, 150);
  camera.position.set(19,22,25); camera.lookAt(0,0.4,0); camera.updateMatrixWorld(true); return camera;
}
