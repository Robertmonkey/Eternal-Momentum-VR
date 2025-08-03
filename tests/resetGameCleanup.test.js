import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

const { state, resetGame } = await import('../modules/state.js');

test('resetGame removes enemies from scene', () => {
  const scene = new THREE.Group();
  const enemy = new THREE.Group();
  scene.add(enemy);
  state.enemies.push(enemy);

  resetGame();

  assert.equal(enemy.parent, null);
  assert.equal(state.enemies.length, 0);
});
