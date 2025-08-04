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

const { state } = await import('../modules/state.js');
const { addPowerToInventory, useOffensivePower } = await import('../modules/PowerManager.js');
const { initGameHelpers } = await import('../modules/gameHelpers.js');

test('adding power and recycling does not consume inventory', () => {
  const updateHud = mock.fn();
  const addStatusEffect = mock.fn();
  initGameHelpers({ play: () => {}, updateHud, addStatusEffect });

  state.offensiveInventory = [null, null, null];
  state.player.unlockedOffensiveSlots = 3;
  state.player.purchasedTalents = new Map();

  addPowerToInventory('missile');
  assert.equal(state.offensiveInventory[0], 'missile');
  assert.equal(updateHud.mock.calls.length, 1);

  state.player.purchasedTalents.set('energetic-recycling', 1);
  const originalRandom = Math.random;
  Math.random = () => 0; // Ensure recycling triggers
  useOffensivePower();
  Math.random = originalRandom;

  assert.equal(state.offensiveInventory[0], 'missile');
  assert.equal(addStatusEffect.mock.calls[0].arguments[0], 'Recycled');
  assert.equal(updateHud.mock.calls.length, 2);
});

