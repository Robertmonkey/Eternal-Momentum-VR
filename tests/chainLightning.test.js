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
const { useOffensivePower } = await import('../modules/PowerManager.js');
const { updateEffects3d, setProjectileGroup } = await import('../modules/projectilePhysics3d.js');
const { initGameHelpers } = await import('../modules/gameHelpers.js');

test('chain lightning damages multiple enemies and renders beams', () => {
  initGameHelpers({ play: () => {}, pulseControllers: () => {}, addStatusEffect: () => {} });

  state.effects.length = 0;
  state.enemies.length = 0;
  state.offensiveInventory = ['chain', null, null];

  state.player.position.set(0, 0, 50);

  const enemy1 = { position: new THREE.Vector3(0, 0, 45), r: 0.5, alive: true, isFriendly: false, takeDamage: mock.fn() };
  const enemy2 = { position: new THREE.Vector3(5, 0, 40), r: 0.5, alive: true, isFriendly: false, takeDamage: mock.fn() };
  const enemy3 = { position: new THREE.Vector3(-5, 0, 40), r: 0.5, alive: true, isFriendly: false, takeDamage: mock.fn() };
  state.enemies.push(enemy1, enemy2, enemy3);

  const group = new THREE.Group();
  setProjectileGroup(group);

  useOffensivePower();
  let effect = state.effects.find(e => e.type === 'chain_lightning');
  assert.ok(effect, 'chain lightning spawned');

  const realNow = Date.now;
  let mockTime = realNow();
  Date.now = () => mockTime;

  // advance time for first link
  mockTime += 100;
  updateEffects3d(50);
  assert.ok(group.children.length > 0, 'beam spawned');

  // progress until effect resolves
  while (state.effects.includes(effect)) {
    mockTime += 100;
    updateEffects3d(50);
  }
  Date.now = realNow;

  assert.equal(group.children.length, 0, 'beams cleaned up');
  assert.ok(enemy1.takeDamage.mock.calls.length > 0, 'enemy1 damaged');
  assert.ok(enemy2.takeDamage.mock.calls.length > 0, 'enemy2 damaged');
  assert.ok(enemy3.takeDamage.mock.calls.length > 0, 'enemy3 damaged');
});

