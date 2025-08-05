import test from 'node:test';
import assert from 'node:assert/strict';
import { drawRing } from '../modules/utils.js';

test('drawRing normalizes radii and clamps alpha', () => {
  const radii = [];
  const ctx = {
    beginPath: () => {},
    arc: (x, y, r) => { radii.push(r); },
    closePath: () => {},
    fill: () => {},
    save: () => {},
    restore: () => {},
    set fillStyle(v) { this._fillStyle = v; },
    get fillStyle() { return this._fillStyle; },
  };
  let alphaSet = 0;
  Object.defineProperty(ctx, 'globalAlpha', {
    set(v) { alphaSet = v; },
    get() { return alphaSet; }
  });
  drawRing(ctx, 0, 0, 10, 5, '#fff', 2);
  assert.deepEqual(radii, [10, 5], 'inner and outer radii should be swapped and clamped');
  assert.equal(alphaSet, 1, 'alpha should be clamped to [0,1]');
});

test('drawRing handles negative radii gracefully', () => {
  const radii = [];
  const ctx = {
    beginPath: () => {},
    arc: (x, y, r) => { radii.push(r); },
    closePath: () => {},
    fill: () => {},
    save: () => {},
    restore: () => {},
    set fillStyle(v) { this._fillStyle = v; },
    get fillStyle() { return this._fillStyle; },
  };
  Object.defineProperty(ctx, 'globalAlpha', {
    set() {},
    get() { return 0; }
  });
  drawRing(ctx, 0, 0, -5, -3, '#fff', 0.5);
  assert.equal(radii.length, 0, 'no arcs should be drawn when outer radius is non-positive');
});
