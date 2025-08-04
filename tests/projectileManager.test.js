import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

const {
  spawnProjectile,
  resetProjectiles,
  getActiveProjectiles,
} = await import('../modules/ProjectileManager.js');

// Helper to clear state between tests
function clearProjectiles() {
  resetProjectiles();
}

test('pooled projectiles reset core properties', () => {
  clearProjectiles();
  const first = spawnProjectile({ r: 2, damage: 5, velocity: new THREE.Vector3(1,0,0) });
  // Simulate cleanup
  resetProjectiles();
  const second = spawnProjectile();
  assert.equal(second.r, 0);
  assert.equal(second.damage, 0);
  assert.ok(second.velocity.lengthSq() === 0);
  clearProjectiles();
});

test('resetProjectiles clears active array and marks projectiles dead', () => {
  clearProjectiles();
  const p = spawnProjectile({ velocity: new THREE.Vector3(1,2,3) });
  resetProjectiles();
  assert.equal(getActiveProjectiles().length, 0);
  const recycled = spawnProjectile();
  assert.ok(recycled.alive);
  assert.ok(recycled.velocity.lengthSq() === 0);
  clearProjectiles();
});
