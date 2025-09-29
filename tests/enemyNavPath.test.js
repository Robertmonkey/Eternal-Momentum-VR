import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { state } from '../modules/state.js';
import { updateEnemies3d, addPathObstacle, clearPathObstacles } from '../modules/enemyAI3d.js';
import { spherePosToUv } from '../modules/utils.js';

function resetState() {
  state.enemies = [];
  state.effects = [];
  clearPathObstacles();
}

function uvDistance(a, b) {
  const du = Math.abs(a.u - b.u);
  const dv = Math.abs(a.v - b.v);
  const wrapU = Math.min(du, 1 - du);
  const wrapV = Math.min(dv, 1 - dv);
  return Math.hypot(wrapU, wrapV);
}

test('enemies fall back to navmesh when antipodal to player', () => {
  resetState();
  state.player.position.set(0, 50, 0);

  const enemy = new THREE.Object3D();
  enemy.position.set(0, -50, 0);
  enemy.speed = 1.5;
  state.enemies.push(enemy);

  updateEnemies3d(50, 2048, 1024, 16);

  assert.ok(enemy.navPath && enemy.navPath.length >= 2, 'nav path should be generated');
  assert.ok(enemy.navPathGoal, 'nav path goal should be stored');
  // Enemy should have stepped away from the exact south pole to begin the arc.
  assert.ok(enemy.position.y > -50, 'enemy should rotate off the pole when pathing');
  // Enemies always remain constrained to the arena radius.
  assert.ok(Math.abs(enemy.position.length() - 50) < 1e-6);
});

test('navmesh path refreshes when player moves', () => {
  resetState();
  state.player.position.set(0, 0, 50);

  const enemy = new THREE.Object3D();
  enemy.position.set(50, 0, 0);
  enemy.speed = 2;
  state.enemies.push(enemy);

  addPathObstacle(0.25, 0.5, 0.2);
  updateEnemies3d(50, 2048, 1024, 16);
  assert.ok(enemy.navPathGoal, 'nav path goal should be initialised');
  const firstGoal = { ...enemy.navPathGoal };

  state.player.position.set(0, 50, 0);
  updateEnemies3d(50, 2048, 1024, 16);
  const updatedGoal = enemy.navPathGoal;
  assert.ok(updatedGoal, 'nav path goal should refresh when player moves');

  const expectedGoal = spherePosToUv(state.player.position.clone().normalize(), 1);
  assert.ok(uvDistance(updatedGoal, expectedGoal) < 0.001, 'goal should match player position');
  assert.ok(uvDistance(firstGoal, updatedGoal) > 0.001, 'goal should change after player moves');
});

