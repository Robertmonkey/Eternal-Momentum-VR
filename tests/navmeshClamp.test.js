import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNavMesh, findPath } from '../modules/navmesh.js';

// Ensure navmesh.findPath sanitizes UV inputs and outputs away from sphere poles
// so navigation never returns coordinates that would trap agents at the
// singularities.
test('findPath wraps coordinates into valid range', () => {
  buildNavMesh();
  const path = findPath({ u: 0.1, v: -0.25 }, { u: 0.9, v: 1.25 });
  // First and last points correspond to sanitized start/end
  const first = path[0];
  const last = path[path.length - 1];
  assert.ok(first.u >= 0 && first.u < 1 && first.v >= 0 && first.v < 1);
  assert.ok(last.u >= 0 && last.u < 1 && last.v >= 0 && last.v < 1);
  // Ensure every waypoint stays within range
  path.forEach(p => {
    assert.ok(p.u >= 0 && p.u < 1);
    assert.ok(p.v >= 0 && p.v < 1);
  });
});
