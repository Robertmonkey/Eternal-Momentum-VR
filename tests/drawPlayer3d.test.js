import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { drawPlayer, toCanvasPos } from '../modules/utils.js';

function createCtx() {
  const calls = [];
  const ctx = {
    canvas: { width: 2048, height: 1024 },
    beginPath() { calls.push('beginPath'); },
    arc(x, y, r) { calls.push({ x, y, r }); },
    fill() { calls.push('fill'); },
    set fillStyle(_) { /* ignore */ },
    get fillStyle() { return null; }
  };
  return { ctx, calls };
}

test('drawPlayer projects 3D position to canvas coords', () => {
  const { ctx, calls } = createCtx();

  const player = {
    position: new THREE.Vector3(0, 1, 0),
    r: 10
  };

  drawPlayer(ctx, player, '#fff');
  const arcCall = calls.find(c => typeof c === 'object');
  assert.deepEqual(arcCall, { x: 1024, y: 0, r: 10 });
});

test('drawPlayer projects negative X coordinate', () => {
  const { ctx, calls } = createCtx();
  const player = {
    position: new THREE.Vector3(-1, 0, 0),
    r: 10
  };
  drawPlayer(ctx, player, '#fff');
  const arcCall = calls.find(c => typeof c === 'object');
  assert.deepEqual(arcCall, { x: 2048, y: 512, r: 10 });
});

test('drawPlayer projects corner of view frustum', () => {
  const { ctx, calls } = createCtx();
  const player = {
    position: new THREE.Vector3(-1, -1, 1),
    r: 10
  };
  drawPlayer(ctx, player, '#fff');
  const arcCall = calls.find(c => typeof c === 'object');
  const { x, y } = toCanvasPos(player.position, ctx.canvas.width, ctx.canvas.height);
  assert.deepEqual(arcCall, { x, y, r: 10 });
});
