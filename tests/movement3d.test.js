import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { getSphericalDirection } from '../modules/movement3d.js';

test('getSphericalDirection returns a tangent unit vector toward target', () => {
  const from = new THREE.Vector3(1, 0, 0);
  const to = new THREE.Vector3(0, 1, 0);
  const dir = getSphericalDirection(from, to);
  assert.ok(Math.abs(dir.length() - 1) < 1e-6, 'direction should be unit length');
  assert.ok(Math.abs(dir.dot(from)) < 1e-2, 'direction should be tangent to from');
  assert.ok(dir.dot(to) > 0, 'direction should point toward target');
});
