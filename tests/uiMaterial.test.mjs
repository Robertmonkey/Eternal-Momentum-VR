import assert from 'assert';
import { MeshStandardMaterial, DoubleSide } from '../vendor/three.module.js';

global.window = {};
global.document = {
  createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 0 }), fillText: () => {} }) }),
  getElementById: () => null
};

const { holoMaterial } = await import('../modules/UIManager.js');

const mat = holoMaterial(0x123456, 0.5);
assert(mat instanceof MeshStandardMaterial, 'returns material');
assert.strictEqual(mat.color.getHex(), 0x123456, 'sets color');
assert.strictEqual(mat.emissive.getHex(), 0x123456, 'sets emissive');
assert.strictEqual(mat.opacity, 0.5, 'sets opacity');
assert.strictEqual(mat.transparent, true, 'is transparent');
assert.strictEqual(mat.side, DoubleSide, 'double sided');
console.log('uiMaterial test passed');
