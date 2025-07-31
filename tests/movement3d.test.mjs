import assert from 'assert';
import * as THREE from 'three';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { moveTowards } = await import('../modules/movement3d.js');

const radius = 1;
let pos = new THREE.Vector3(0, radius, 0);
const target = new THREE.Vector3(radius, 0, 0);

const uv = moveTowards(pos, target, 1, radius);

assert(Math.abs(pos.length() - radius) < 1e-6, 'Avatar remains on sphere');
assert(uv.u >= 0 && uv.u <= 1 && uv.v >= 0 && uv.v <= 1, 'UV coordinates in range');

console.log('movement3d tests passed');
