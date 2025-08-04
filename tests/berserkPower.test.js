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
const { initGameHelpers } = await import('../modules/gameHelpers.js');

test('berserk power applies status and timer', () => {
  const addStatus = mock.fn();
  initGameHelpers({ play: () => {}, pulseControllers: () => {}, addStatusEffect: addStatus });

  state.player.berserkUntil = 0;
  powers.berserk.apply();

  assert.ok(state.player.berserkUntil > Date.now(), 'berserk timer set');
  assert.equal(addStatus.mock.calls.length, 1, 'status effect added');
});
