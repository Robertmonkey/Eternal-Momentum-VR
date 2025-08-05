import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNavMesh, findPath } from '../modules/navmesh.js';
import { UV_EPSILON } from '../modules/movement3d.js';

// Ensure navmesh.findPath sanitizes UV inputs and outputs away from sphere poles
// so navigation never returns coordinates that would trap agents at the
// singularities.
test('findPath clamps coordinates away from poles', () => {
  buildNavMesh();
  const path = findPath({ u: 0.1, v: -0.25 }, { u: 0.9, v: 1.25 });
  // First and last points correspond to sanitized start/end
  const first = path[0];
  const last = path[path.length - 1];
  assert.ok(first.v >= UV_EPSILON && first.v <= 1 - UV_EPSILON);
  assert.ok(last.v >= UV_EPSILON && last.v <= 1 - UV_EPSILON);
  // Ensure every waypoint stays within the safe latitude band
  path.forEach(p => {
    assert.ok(p.v >= UV_EPSILON && p.v <= 1 - UV_EPSILON);
  });
});
