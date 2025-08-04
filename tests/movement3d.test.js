import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {
  getSphericalDirection,
  sanitizeUv,
  UV_EPSILON,
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

test('sanitizeUv keeps coordinates within safe bounds', () => {
  const { u, v } = sanitizeUv({ u: 1.25, v: 1.5 });
  assert.ok(u >= 0 && u < 1, 'u should wrap to [0,1)');
  assert.ok(v >= UV_EPSILON && v <= 1 - UV_EPSILON, 'v should be clamped away from poles');
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
