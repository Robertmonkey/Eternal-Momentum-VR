import assert from 'assert';
import * as THREE from 'three';

const utils = await import('../modules/utils.js');

const vec = new THREE.Vector3(-1, 0, 0);
const pos = utils.toCanvasPos(vec, 2048, 1024);
assert.strictEqual(pos.x, 2048, 'x pixel coordinate');
assert.strictEqual(pos.y, 512, 'y pixel coordinate');

console.log('toCanvasPos test passed');
