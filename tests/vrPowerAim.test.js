import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

let mockController = null;
await mock.module('../modules/UIManager.js', {
  namedExports: { createTextSprite: () => new THREE.Object3D() }
});
await mock.module('../modules/scene.js', {
  namedExports: {
    getScene: () => null,
    getCamera: () => null,
    getRenderer: () => ({}),
    getPrimaryController: () => mockController
  }
});
await mock.module('../modules/cores.js', {
  namedExports: { handleCoreOnDefensivePower: () => {} }
});
await mock.module('../modules/CoreManager.js', {
  namedExports: { onPickup: () => {} }
});

const { state } = await import('../modules/state.js');
const { usePower } = await import('../modules/powers.js');
const { initGameHelpers } = await import('../modules/gameHelpers.js');

initGameHelpers({ play: () => {}, addStatusEffect: () => {}, pulseControllers: () => {} });

function resetState() {
  state.effects.length = 0;
  state.enemies.length = 0;
  state.cursorDir.set(0, 0, -1);
  state.player.position.set(0, 0, 0);
  state.offensiveInventory = [null, null, null];
  state.defensiveInventory = [null, null, null];
}

test('ricochet shot spawns at controller tip', () => {
  resetState();
  const controller = new THREE.Object3D();
  controller.position.set(1, 2, 3);
  controller.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
  mockController = controller;

  usePower('ricochetShot');
  const effect = state.effects.find(e => e.type === 'ricochet_projectile');
  assert.ok(effect, 'ricochet projectile should be created');
  assert.deepEqual(effect.position.toArray(), controller.position.clone().add(new THREE.Vector3(0, 0, 0.1)).toArray());
});

test('chain lightning selects enemy in cursor direction first', () => {
  resetState();
  mockController = null;
  const enemyFront = { position: new THREE.Vector3(0, 0, -10), isFriendly: false };
  const enemySide = { position: new THREE.Vector3(10, 0, 0), isFriendly: false };
  state.enemies.push(enemyFront, enemySide);
  state.cursorDir.set(0, 0, -1);

  usePower('chain');
  const effect = state.effects.find(e => e.type === 'chain_lightning');
  assert.ok(effect, 'chain lightning effect should exist');
  assert.equal(effect.targets[0], enemyFront);
});
