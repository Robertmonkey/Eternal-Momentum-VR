import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

// Mock modules to avoid DOM/WebXR dependencies
await mock.module('../modules/UIManager.js', {
  namedExports: { createTextSprite: () => new THREE.Object3D() }
});
await mock.module('../modules/scene.js', {
  namedExports: {
    getScene: () => null,
    getCamera: () => null,
    getRenderer: () => ({}),
    getPrimaryController: () => ({
      getWorldPosition: v => v.set(0, 0, 50),
      getWorldDirection: v => v.set(0, 0, -1)
    })
  }
});
await mock.module('../modules/cores.js', {
  namedExports: { handleCoreOnDefensivePower: () => {} }
});
await mock.module('../modules/CoreManager.js', {
  namedExports: { onPickup: () => {} }
});

const { state } = await import('../modules/state.js');
const { useOffensivePower } = await import('../modules/PowerManager.js');
const { updateEffects3d, updateProjectiles3d } = await import('../modules/projectilePhysics3d.js');
const { initGameHelpers } = await import('../modules/gameHelpers.js');

test('missile launches fireball that explodes on target', () => {
  initGameHelpers({ play: () => {}, pulseControllers: () => {}, addStatusEffect: () => {} });

  state.effects.length = 0;
  state.enemies.length = 0;
  state.offensiveInventory = ['missile', null, null];

  state.player.position.set(0, 0, 50);
  // Intentionally misalign cursor direction; controller orientation should be used
  state.cursorDir.set(1, 0, 0);

  const enemy = {
    position: new THREE.Vector3(0, 0, -50),
    r: 0.5,
    alive: true,
    isFriendly: false,
    takeDamage: mock.fn()
  };
  state.enemies.push(enemy);

  useOffensivePower();
  const fireball = state.effects.find(e => e.type === 'fireball');
  assert.ok(fireball, 'fireball spawned');

  for (let i = 0; i < 200 && state.effects.includes(fireball); i++) {
    updateEffects3d(50);
    updateProjectiles3d(50, 1000, 1000);
  }

  // Run a few extra frames to process the resulting explosion
  for (let i = 0; i < 20; i++) {
    updateEffects3d(50);
  }

  assert.ok(!state.effects.includes(fireball), 'fireball resolved');
  assert.ok(enemy.takeDamage.mock.calls.length > 0, 'enemy damaged by explosion');
});
