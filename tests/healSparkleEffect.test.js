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
const { powers } = await import('../modules/powers.js');
const { initGameHelpers } = await import('../modules/gameHelpers.js');

test('heal power spawns sparkle effect', () => {
  initGameHelpers({ play: () => {}, pulseControllers: () => {}, addStatusEffect: () => {} });

  const group = new THREE.Group();
  setProjectileGroup(group);

  state.effects.length = 0;
  state.player.health = 50;
  powers.heal.apply();

  assert.ok(state.player.health > 50, 'health increased');
  assert.equal(state.effects.length, 1, 'heal effect queued');
  const effect = state.effects[0];
  updateEffects3d(50);
  assert.equal(group.children.length, 1, 'heal sparkle mesh added');
  effect.endTime = Date.now() - 1;
  updateEffects3d(50);
  assert.equal(group.children.length, 0, 'heal mesh removed after expiry');
});
