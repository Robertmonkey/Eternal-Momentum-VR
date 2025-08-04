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
  namedExports: { handleCoreOnDefensivePower: () => {} }
});
await mock.module('../modules/CoreManager.js', {
  namedExports: { onPickup: () => {} }
});

const { state } = await import('../modules/state.js');
const { updateEffects3d } = await import('../modules/projectilePhysics3d.js');
const { initGameHelpers } = await import('../modules/gameHelpers.js');

test('paradox echo replays power after delay', () => {
  initGameHelpers({ play: () => {}, pulseControllers: () => {}, addStatusEffect: () => {} });

  state.effects.length = 0;
  state.cursorDir.set(0, 1, 0);
  const originalDir = state.cursorDir.clone();

  const echo = {
    type: 'paradox_player_echo',
    powerKey: 'shockwave',
    position: new THREE.Vector3(1, 0, 0),
    cursorDir: new THREE.Vector3(0, 0, -1),
    startTime: Date.now() - 1000
  };
  state.effects.push(echo);

  updateEffects3d(50);

  assert.ok(!state.effects.includes(echo), 'echo effect consumed');
  const sw = state.effects.find(e => e.type === 'shockwave');
  assert.ok(sw, 'shockwave spawned');
  assert.ok(sw.position.distanceTo(new THREE.Vector3(1,0,0)) < 1e-6, 'shockwave at echo position');
  assert.ok(state.cursorDir.equals(originalDir), 'cursorDir restored');
});
