import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

// Mock UI and scene dependencies to avoid DOM and WebXR
await mock.module('../modules/UIManager.js', {
  namedExports: { createTextSprite: () => new THREE.Object3D(), PIXELS_PER_UNIT: 1000 }
});
await mock.module('../modules/scene.js', {
  namedExports: {
    getScene: () => null,
    getCamera: () => null,
    getRenderer: () => ({}),
    getPrimaryController: () => null
  }
});
await mock.module('../modules/cores.js', {
  namedExports: { handleCoreOnDefensivePower: () => {} }
});
await mock.module('../modules/CoreManager.js', {
  namedExports: { onPickup: () => {} }
});

// Import modules under test
const { state } = await import('../modules/state.js');
const { updatePickups3d } = await import('../modules/pickupPhysics3d.js');
const { useOffensivePower } = await import('../modules/PowerManager.js');
const { initGameHelpers } = await import('../modules/gameHelpers.js');

test('pickup adds power and trigger uses it', () => {
  const updateHud = mock.fn();
  initGameHelpers({ play: () => {}, updateHud });

  state.player.position.set(0, 0, 50);
  state.cursorDir.set(0, 0, 1);
  state.pickups.push({ position: new THREE.Vector3(0, 0, 50), r: 0.5, type: 'missile' });

  updatePickups3d(50);
  assert.equal(state.offensiveInventory[0], 'missile');
  assert.equal(updateHud.mock.calls.length, 1);

  useOffensivePower();
  assert.equal(state.offensiveInventory[0], null);
  assert.equal(updateHud.mock.calls.length, 2);
});
