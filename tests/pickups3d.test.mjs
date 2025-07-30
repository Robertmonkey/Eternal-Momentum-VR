import assert from 'assert';
import * as THREE from 'three';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { state, resetGame } = await import('../modules/state.js');
const { spawnPickup } = await import('../modules/gameLoop.js');
const { handleCoreOnDamageDealt } = await import('../modules/cores.js');

resetGame(false);

spawnPickup();
assert.strictEqual(state.pickups.length, 1, 'pickup spawned');
assert.equal(typeof state.pickups[0].position.x, 'number');
assert.equal(typeof state.pickups[0].position.y, 'number');
assert.equal(typeof state.pickups[0].position.z, 'number');

state.pickups.length = 0;
const dummy = { position: new THREE.Vector3(1, 0, 0), boss: false };
const originalRandom = Math.random;
Math.random = () => 0.01;
state.player.equippedAberrationCore = 'vampire';
handleCoreOnDamageDealt(dummy, {});
Math.random = originalRandom;
assert.strictEqual(state.pickups.length, 1, 'vampire orb spawned');
assert.equal(typeof state.pickups[0].position.x, 'number');
assert.equal(typeof state.pickups[0].position.y, 'number');
assert.equal(typeof state.pickups[0].position.z, 'number');

console.log('pickups3d test passed');
