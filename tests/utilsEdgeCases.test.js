import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

const { randomInRange, safeAddEventListener, drawLightning, lineCircleCollision, rotateAroundNormal } = await import('../modules/utils.js');

test('randomInRange handles reversed and invalid ranges', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  const val = randomInRange(5, 1);
  Math.random = originalRandom;
  assert.ok(val >= 1 && val <= 5);
  assert.ok(Number.isNaN(randomInRange('a', 5)));
});

test('safeAddEventListener guards inputs and reports status', () => {
  const handler = () => {};
  const el = { addEventListener: mock.fn() };
  assert.equal(safeAddEventListener(el, 'click', handler), true);
  assert.equal(el.addEventListener.mock.calls.length, 1);
  assert.equal(safeAddEventListener(null, 'click', handler), false);
});

test('drawLightning clamps width to non-negative values', () => {
  const ctx = {
    save(){}, restore(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){},
    lineWidth: 0, strokeStyle: '', globalAlpha: 1
  };
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  drawLightning(ctx, 0, 0, 10, 0, '#fff', -3);
  Math.random = originalRandom;
  assert.equal(ctx.lineWidth, 1);
});

test('lineCircleCollision respects radius and segment bounds', () => {
  assert.equal(lineCircleCollision(0,0,10,0,5,0,-3), false);
  assert.equal(lineCircleCollision(0,0,10,0,5,0,3), true);
});

test('rotateAroundNormal returns original vector for degenerate inputs', () => {
  const dir = new THREE.Vector3(1, 0, 0);
  const result = rotateAroundNormal(dir, new THREE.Vector3(0, 0, 0), Math.PI / 2);
  assert.deepEqual(result, dir);
  const resultNaN = rotateAroundNormal(dir, new THREE.Vector3(0, 1, 0), NaN);
  assert.deepEqual(resultNaN, dir);
});
