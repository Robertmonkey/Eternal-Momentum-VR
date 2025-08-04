import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

// Mock UI and scene dependencies to avoid DOM and WebXR
await mock.module('../modules/UIManager.js', {
  namedExports: { createTextSprite: () => new THREE.Object3D() }
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

const { state, resetGame } = await import('../modules/state.js');
const { updatePickups3d } = await import('../modules/pickupPhysics3d.js');
const { initGameHelpers } = await import('../modules/gameHelpers.js');

test('player collects pickup after resetGame without movement update', () => {
  const updateHud = mock.fn();
  initGameHelpers({ play: () => {}, updateHud });

  resetGame();
  state.cursorDir.set(0, 0, 1);
  state.pickups.push({ position: new THREE.Vector3(0, 0, 50), r: 0.5, type: 'missile' });

  updatePickups3d(50);
  assert.equal(state.offensiveInventory[0], 'missile');
});
