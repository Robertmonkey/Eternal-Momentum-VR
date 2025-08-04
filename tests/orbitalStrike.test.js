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
const { powers } = await import('../modules/powers.js');
const { updateEffects3d } = await import('../modules/projectilePhysics3d.js');
const { initGameHelpers } = await import('../modules/gameHelpers.js');

test('orbital strike damages target and spawns shockwave', () => {
  initGameHelpers({ play: () => {}, pulseControllers: () => {}, addStatusEffect: () => {} });

  state.effects.length = 0;
  state.enemies.length = 0;

  const enemy = { position: new THREE.Vector3(0, 0, 50), r: 0.5, alive: true, isFriendly: false, takeDamage: mock.fn() };
  state.enemies.push(enemy);

  powers.orbitalStrike.apply();
  const target = state.effects.find(e => e.type === 'orbital_target');
  assert.ok(target, 'target effect created');
  target.startTime = Date.now() - 1600;

  updateEffects3d(50);
  const shockwave = state.effects.find(e => e.type === 'shockwave');
  assert.ok(enemy.takeDamage.mock.calls.length > 0, 'enemy damaged');
  assert.ok(shockwave, 'shockwave spawned');
});
