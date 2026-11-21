import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Original, texture-free models. Dimensions are in stylised metres; +Z is forward.
// Named groups deliberately separate heads, limbs and trunks for later animation.
export const PALETTE = {
  grass: '#91b979', grassLight: '#b7cd8d', earth: '#c4ad83', sand: '#e3d2a4',
  wood: '#b48a61', woodLight: '#d8b78d', dark: '#283e40', cream: '#fff1cf',
  gold: '#e8b95d', spots: '#ad7947', elephant: '#8ca9ad', ear: '#acbec0',
  penguin: '#354e58', white: '#f5f0df', orange: '#e9a64f', water: '#78bbca',
};
const materials = new Map();
export function material(hex) {
  if (!materials.has(hex)) materials.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 1, flatShading: true }));
  return materials.get(hex);
}
export function group(parent, name, x = 0, y = 0, z = 0) {
  const value = new THREE.Group(); value.name = name; value.position.set(x, y, z); parent.add(value); return value;
}
export function shape(parent, geometry, hex, x = 0, y = 0, z = 0, name = '') {
  const mesh = new THREE.Mesh(geometry, material(hex)); mesh.position.set(x, y, z);
  mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function box(parent, x, y, z, w, h, d, hex, radius = 0.06, name = '') {
  const geometry = radius > 0 ? new RoundedBoxGeometry(w, h, d, 1, Math.min(radius, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d);
  return shape(parent, geometry, hex, x, y, z, name);
}
export function ellipsoid(parent, x, y, z, w, h, d, hex, detail = 1, name = '') {
  const geometry = new THREE.IcosahedronGeometry(0.5, detail); geometry.scale(w, h, d);
  return shape(parent, geometry, hex, x, y, z, name);
}
export function rod(parent, a, b, radius, hex, tipRadius = radius, sides = 7, name = '') {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
  const mesh = shape(parent, new THREE.CylinderGeometry(tipRadius, radius, delta.length(), sides), hex, 0, 0, 0, name);
  mesh.position.copy(start.add(end).multiplyScalar(0.5)); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return mesh;
}
function eye(parent, x, y, z, size = 0.055) {
  ellipsoid(parent, x, y, z, size, size * 1.15, size * 0.65, PALETTE.dark, 1, 'eye');
  ellipsoid(parent, x - size * 0.12, y + size * 0.16, z + size * 0.27, size * 0.24, size * 0.24, size * 0.2, '#fff9ec', 0, 'eye_glint');
}

export function makeGiraffe() {
  const root = new THREE.Group(); root.name = 'Giraffe';
  box(root, 0, 1.55, -0.15, 0.86, 0.91, 1.49, PALETTE.gold, 0.17, 'body');
  for (const x of [-0.29, 0.29]) for (const z of [-0.65, 0.35]) {
    const leg = group(root, `leg_${x}_${z}`, x, 1.21, z);
    box(leg, 0, -0.54, 0, 0.19, 1.16, 0.23, PALETTE.gold, 0.045);
    box(leg, 0, -1.115, 0.02, 0.21, 0.14, 0.27, '#776449', 0.025, 'hoof');
  }
  const neck = group(root, 'neck', 0, 1.78, 0.36); neck.rotation.x = 0.15;
  box(neck, 0, 0.66, 0, 0.39, 1.62, 0.43, PALETTE.gold, 0.075);
  box(neck, 0, 0.67, -0.23, 0.12, 1.60, 0.08, '#9c7145', 0.015, 'mane');
  const head = group(neck, 'head', 0, 1.46, 0.12);
  box(head, 0, 0.02, 0.15, 0.54, 0.51, 0.76, PALETTE.gold, 0.105);
  box(head, 0, -0.12, 0.49, 0.49, 0.28, 0.36, '#f3d99b', 0.07, 'muzzle');
  for (const s of [-1, 1]) {
    const ear = ellipsoid(head, s * 0.37, 0.21, -0.02, 0.37, 0.15, 0.22, PALETTE.gold, 1, 'ear'); ear.rotation.z = s * 0.36;
    ellipsoid(head, s * 0.38, 0.245, 0.025, 0.22, 0.055, 0.12, '#c7915e');
    rod(head, [s * 0.15, 0.23, -0.04], [s * 0.16, 0.49, -0.065], 0.045, PALETTE.gold, 0.04, 6, 'ossicone');
    ellipsoid(head, s * 0.16, 0.49, -0.065, 0.115, 0.11, 0.115, '#8c6744', 1);
    eye(head, s * 0.18, 0.08, 0.532, 0.065);
    ellipsoid(head, s * 0.15, -0.10, 0.668, 0.045, 0.045, 0.018, '#93754c', 0);
  }
  // Spots sit just above the coat, rather than intersecting the silhouette.
  for (const s of [-1, 1]) {
    for (const [y, z, w, h] of [[1.5, -0.55, 0.22, 0.25], [1.72, -0.2, 0.24, 0.22], [1.4, 0.14, 0.21, 0.24], [1.7, 0.34, 0.18, 0.22], [1.33, -0.27, 0.18, 0.18]]) {
      ellipsoid(root, s * 0.431, y, z, 0.022, h, w, PALETTE.spots, 0);
    }
    for (let i = 0; i < 5; i++) box(neck, s * 0.199, 0.13 + i * 0.27, i % 2 ? 0.04 : -0.065, 0.012, 0.15, 0.18, PALETTE.spots, 0.015);
  }
  rod(root, [0, 1.6, -0.86], [0.05, 0.92, -1.02], 0.035, PALETTE.gold, 0.025, 6, 'tail');
  ellipsoid(root, 0.05, 0.86, -1.02, 0.14, 0.25, 0.13, '#805f41');
  root.userData = { species: 'giraffe', height: 3.8, original: true }; return root;
}

export function makeElephant() {
  const root = new THREE.Group(); root.name = 'Elephant';
  ellipsoid(root, 0, 1.19, -0.22, 1.50, 1.35, 2.0, PALETTE.elephant, 2, 'body');
  for (const x of [-0.49, 0.49]) for (const z of [-0.77, 0.41]) {
    const leg = group(root, `leg_${x}_${z}`, x, 0.85, z);
    box(leg, 0, -0.35, 0, 0.44, 0.98, 0.48, PALETTE.elephant, 0.11);
    for (const dx of [-0.11, 0, 0.11]) box(leg, dx, -0.74, 0.231, 0.075, 0.12, 0.035, '#d2d7ce', 0.015, 'toenail');
  }
  const head = group(root, 'head', 0, 1.49, 0.67);
  for (const s of [-1, 1]) {
    const ear = ellipsoid(head, s * 0.65, 0.03, -0.08, 0.82, 1.04, 0.20, PALETTE.elephant, 1, 'ear'); ear.rotation.z = -s * 0.12;
    const inner = ellipsoid(head, s * 0.68, 0.04, 0.025, 0.56, 0.73, 0.045, PALETTE.ear, 1, 'inner_ear'); inner.rotation.z = -s * 0.12;
  }
  ellipsoid(head, 0, 0.09, 0.06, 1.05, 1.02, 0.91, PALETTE.elephant, 2);
  for (const s of [-1, 1]) {
    eye(head, s * 0.344, 0.15, 0.414, 0.064);
    const brow = box(head, s * 0.345, 0.26, 0.399, 0.18, 0.045, 0.04, '#77979d', 0.015); brow.rotation.z = -s * 0.12;
    rod(head, [s * 0.29, -0.19, 0.35], [s * 0.32, -0.34, 0.65], 0.065, '#f5e6bf', 0.032, 7, 'tusk');
    rod(head, [s * 0.32, -0.34, 0.65], [s * 0.32, -0.28, 0.79], 0.032, '#f5e6bf', 0.002, 7);
  }
  const trunk = group(head, 'trunk');
  const points = [[0,-0.04,0.42],[0,-0.27,0.56],[0,-0.55,0.62],[0,-0.83,0.67],[0,-1.02,0.81],[0,-1.0,1.02],[0,-0.87,1.09]];
  points.slice(0, -1).forEach((p, i) => rod(trunk, p, points[i + 1], 0.17 - i * 0.016, PALETTE.elephant, 0.154 - i * 0.016, 8));
  ellipsoid(trunk, 0, -0.86, 1.095, 0.12, 0.065, 0.08, '#587e88', 1, 'trunk_tip');
  rod(root, [0, 1.35, -1.18], [0.09, 0.74, -1.40], 0.038, PALETTE.elephant, 0.025, 6, 'tail');
  ellipsoid(root, 0.09, 0.68, -1.4, 0.11, 0.19, 0.11, '#58747a');
  root.userData = { species: 'elephant', height: 2.1, original: true }; return root;
}

export function makePenguin() {
  const root = new THREE.Group(); root.name = 'Penguin';
  ellipsoid(root, 0, 0.52, 0, 0.68, 0.97, 0.59, PALETTE.penguin, 2, 'body');
  ellipsoid(root, 0, 0.43, 0.222, 0.46, 0.66, 0.18, PALETTE.white, 2, 'belly');
  const head = group(root, 'head', 0, 0.92, 0.03);
  ellipsoid(head, 0, 0, 0, 0.53, 0.48, 0.48, PALETTE.penguin, 2);
  for (const s of [-1, 1]) {
    ellipsoid(head, s * 0.135, -0.043, 0.19, 0.19, 0.19, 0.095, PALETTE.white, 1);
    eye(head, s * 0.13, 0.015, 0.239, 0.047);
    const wing = group(root, `flipper_${s}`, s * 0.32, 0.66, 0); wing.rotation.z = s * 0.32;
    ellipsoid(wing, s * 0.035, -0.16, 0, 0.12, 0.49, 0.20, PALETTE.penguin, 1);
    ellipsoid(root, s * 0.16, 0.065, 0.14, 0.24, 0.12, 0.36, PALETTE.orange, 1, 'foot');
  }
  const beak = shape(head, new THREE.ConeGeometry(0.115, 0.24, 4), PALETTE.orange, 0, -0.065, 0.34, 'beak'); beak.rotation.x = Math.PI / 2; beak.rotation.z = Math.PI / 4;
  ellipsoid(root, 0, 0.27, -0.28, 0.18, 0.2, 0.29, PALETTE.penguin, 0, 'tail');
  root.userData = { species: 'penguin', height: 1.17, original: true }; return root;
}

export const ANIMALS = { giraffe: makeGiraffe, elephant: makeElephant, penguin: makePenguin };
