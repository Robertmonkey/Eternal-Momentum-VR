import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {
  getSphericalDirection,
  sanitizeUv,
  moveTowards,
} from '../modules/movement3d.js';

test('getSphericalDirection returns a tangent unit vector toward target', () => {
  const from = new THREE.Vector3(1, 0, 0);
  const to = new THREE.Vector3(0, 1, 0);
  const dir = getSphericalDirection(from, to);
  assert.ok(Math.abs(dir.length() - 1) < 1e-6, 'direction should be unit length');
  assert.ok(Math.abs(dir.dot(from)) < 1e-2, 'direction should be tangent to from');
  assert.ok(dir.dot(to) > 0, 'direction should point toward target');
});

test('getSphericalDirection handles antipodal points without instability', () => {
  const from = new THREE.Vector3(0, 0, 1);
  const to = new THREE.Vector3(0, 0, -1);
  const dir = getSphericalDirection(from, to);
  assert.ok(Number.isFinite(dir.length()), 'direction should be a finite vector');
  assert.ok(Math.abs(dir.length() - 1) < 1e-6, 'direction should be unit length');
  assert.ok(Math.abs(dir.dot(from)) < 1e-2, 'direction should be tangent to from');
});

test('getSphericalDirection returns zero vector when inputs are degenerate', () => {
  const from = new THREE.Vector3();
  const to = new THREE.Vector3(1, 0, 0);
  const dir = getSphericalDirection(from, to);
  assert.equal(dir.length(), 0, 'should handle zero-length vectors gracefully');
});

test('sanitizeUv wraps coordinates and handles non-finite values', () => {
  const { u, v } = sanitizeUv({ u: 1.25, v: -0.5 });
  assert.ok(u >= 0 && u < 1, 'u should wrap to [0,1)');
  assert.ok(v >= 0 && v < 1, 'v should wrap to [0,1)');

  const def = sanitizeUv({ u: Infinity, v: Infinity });
  assert.ok(Math.abs(def.u - 0.5) < 1e-6, 'non-finite u should default to 0.5');
  assert.ok(Math.abs(def.v - 0.5) < 1e-6, 'non-finite v should default to 0.5');
});

test('moveTowards respects delta time and stays on sphere', () => {
  const radius = 1;
  const start1 = new THREE.Vector3(0, 0, 1);
  const start2 = start1.clone();
  const target = new THREE.Vector3(0, 1, 0);
  moveTowards(start1, target, 1, radius, 16);
  moveTowards(start2, target, 1, radius, 32);
  assert.ok(Math.abs(start1.length() - radius) < 1e-6, 'movement should remain on sphere');
  assert.ok(start2.distanceTo(target) < start1.distanceTo(target), 'larger delta should move farther');
});

