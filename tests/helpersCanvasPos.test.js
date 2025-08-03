import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

const { setPositionFromCanvas, getCanvasPos } = await import('../modules/helpers.js');

test('getCanvasPos and setPositionFromCanvas round-trip a vector', () => {
  const original = new THREE.Vector3(0.2, 0.8, -0.5).normalize();
  const { x, y } = getCanvasPos({ position: original });
  const reconstructed = new THREE.Vector3();
  setPositionFromCanvas(reconstructed, x, y);
  assert.ok(reconstructed.distanceTo(original) < 1e-6);
});
