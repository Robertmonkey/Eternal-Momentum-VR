import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

await mock.module('../modules/UIManager.js', {
  namedExports: { createTextSprite: () => new THREE.Object3D(), PIXELS_PER_UNIT: 1000 }
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

const ARENA_RADIUS = 50;

test('shockwave adds and removes visual mesh', () => {
  initGameHelpers({ play: () => {}, pulseControllers: () => {}, addStatusEffect: () => {} });

  const group = new THREE.Group();
  setProjectileGroup(group);

  state.effects.length = 0;
  const effect = {
    type: 'shockwave',
    caster: state.player,
    position: new THREE.Vector3(),
    radius: 0,
    maxRadius: 1,
    speed: 1,
    startTime: Date.now(),
    hitEnemies: new Set(),
    damage: 0
  };
  state.effects.push(effect);

  updateEffects3d(ARENA_RADIUS);
  assert.equal(group.children.length, 1, 'shockwave mesh added');

  effect.radius = effect.maxRadius;
  updateEffects3d(ARENA_RADIUS);
  assert.equal(group.children.length, 0, 'shockwave mesh removed');
  assert.ok(!state.effects.includes(effect), 'effect removed');
});
