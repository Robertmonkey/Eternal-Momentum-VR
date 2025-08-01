import assert from 'assert';
import { playerHasCore, getCanvasPos } from '../modules/helpers.js';
import { state } from '../modules/state.js';
import { toCanvasPos } from '../modules/utils.js';
import * as THREE from '../vendor/three.module.js';

state.player.equippedAberrationCore = 'gravity';
state.player.activePantheonBuffs = [{ coreId: 'vampire' }];

assert.strictEqual(playerHasCore('gravity'), true, 'equipped core');
assert.strictEqual(playerHasCore('vampire'), true, 'buffed core');
assert.strictEqual(playerHasCore('swarm'), false, 'missing core');

const vecObj = { position: new THREE.Vector3(1, 0, 0) };
const expected = toCanvasPos(vecObj.position);
const result = getCanvasPos(vecObj);
assert.ok(Math.abs(result.x - expected.x) < 1e-6, 'vector x match');
assert.ok(Math.abs(result.y - expected.y) < 1e-6, 'vector y match');

const plain = { x: 5, y: 10 };
const plainResult = getCanvasPos(plain);
assert.deepStrictEqual(plainResult, plain, 'plain object passthrough');

console.log('helpers test passed');
