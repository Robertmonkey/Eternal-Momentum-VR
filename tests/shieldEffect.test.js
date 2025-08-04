import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

await mock.module('../modules/UIManager.js', {
  namedExports: { createTextSprite: () => new THREE.Object3D() }
});
await mock.module('../modules/scene.js', {
  namedExports: {
    getScene: () => null,
    getCamera: () => null,
    getRenderer: () => ({}),
    getPrimaryController: () => null,
    getSecondaryController: () => null
  }
});
await mock.module('../modules/cores.js', {
  namedExports: {
    handleCoreOnDefensivePower: () => {},
    handleCoreOnPlayerDamage: () => {}
  }
});
await mock.module('../modules/CoreManager.js', {
  namedExports: {
    onPickup: () => {},
    applyCorePassives: () => {},
    onCollision: () => {}
  }
});

const { state } = await import('../modules/state.js');
const { updateEffects3d, setProjectileGroup } = await import('../modules/projectilePhysics3d.js');
const { initGameHelpers } = await import('../modules/gameHelpers.js');

test('shield effect adds and removes mesh', () => {
  initGameHelpers({ play: () => {}, pulseControllers: () => {}, addStatusEffect: () => {} });

  const group = new THREE.Group();
  setProjectileGroup(group);

  state.effects.length = 0;
  state.player.shield = true;

  const start = Date.now();
  const effect = { type: 'shield_activation', startTime: start, endTime: start + 100 };
  state.effects.push(effect);

  updateEffects3d(50);
  assert.equal(group.children.length, 1, 'shield mesh added');

  effect.endTime = Date.now() - 1;
  updateEffects3d(50);
  assert.equal(group.children.length, 0, 'shield mesh removed after expiry');
  assert.ok(!state.effects.includes(effect), 'effect removed');
});
