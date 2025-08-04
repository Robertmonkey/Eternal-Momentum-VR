import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

const { getCanvasPos, setPositionFromCanvas, playerHasCore, wrapText } = await import('../modules/helpers.js');
const { spherePosToUv } = await import('../modules/utils.js');
const { state } = await import('../modules/state.js');

test('getCanvasPos accepts Vector3 instances', () => {
  const original = new THREE.Vector3(0.3, -0.2, 0.9).normalize();
  const { x, y } = getCanvasPos(original);
  const reconstructed = new THREE.Vector3();
  setPositionFromCanvas(reconstructed, x, y);
  assert.ok(reconstructed.distanceTo(original) < 1e-6);
});

test('setPositionFromCanvas clamps out-of-range coordinates', () => {
  const vec = new THREE.Vector3();
  setPositionFromCanvas(vec, -50, 5000, 100, 100);
  const uv = spherePosToUv(vec);
  assert.ok(uv.u >= 0 && uv.u <= 1);
  assert.ok(uv.v >= 0 && uv.v <= 1);
});

test('playerHasCore returns false for falsy ids', () => {
  state.player.equippedAberrationCore = null;
  state.player.activePantheonBuffs = [];
  assert.equal(playerHasCore(null), false);
});

test('wrapText returns input when maxLen is non-positive', () => {
  assert.equal(wrapText('hello world', 0), 'hello world');
});
