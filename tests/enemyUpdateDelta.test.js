import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { state } from '../modules/state.js';
import { updateEnemies3d } from '../modules/enemyAI3d.js';

test('updateEnemies3d calls enemy update with delta', () => {
  state.enemies.length = 0;
  state.player.position = new THREE.Vector3(0, 0, 50);
  const enemy = new THREE.Group();
  enemy.position.set(50, 0, 0);
  const start = enemy.position.clone();
  let called = 0;
  enemy.update = (d) => { called = d; };
  enemy.customMovement = true;
  state.enemies.push(enemy);

  updateEnemies3d(50, undefined, undefined, 32);
  assert.equal(called, 32);
  const cross = enemy.position.clone().cross(start);
  assert.ok(cross.length() < 1e-6);
});

test('default movement advances enemy when no custom movement', () => {
  state.enemies.length = 0;
  state.player.position = new THREE.Vector3(0, 0, 50);
  const enemy = new THREE.Group();
  enemy.position.set(50, 0, 0);
  const start = enemy.position.clone();
  state.enemies.push(enemy);

  updateEnemies3d(50, undefined, undefined, 32);
  const cross = enemy.position.clone().cross(start);
  assert.notEqual(cross.length(), 0);
  assert.equal(Math.round(enemy.position.length()), 50);
});

test('updateEnemies3d ignores enemies marked as not alive', () => {
  state.enemies.length = 0;
  state.player.position = new THREE.Vector3(0, 0, 50);
  const enemy = new THREE.Group();
  enemy.position.set(50, 0, 0);
  enemy.alive = false;
  state.enemies.push(enemy);

  updateEnemies3d(50, undefined, undefined, 32);
  // Position should remain unchanged because enemy is skipped.
  assert.equal(enemy.position.x, 50);
  assert.equal(enemy.position.y, 0);
  assert.equal(enemy.position.z, 0);
});
