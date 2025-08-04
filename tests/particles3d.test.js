import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { spawnParticles, updateParticles, toCanvasPos } from '../modules/utils.js';

function createCtx(){
  const calls = [];
  const ctx = {
    canvas: { width: 2048, height: 1024 },
    beginPath(){ calls.push('beginPath'); },
    arc(x,y,r){ calls.push({x,y,r}); },
    fill(){ calls.push('fill'); },
    set fillStyle(_){},
    get fillStyle(){ return null; },
    globalAlpha: 1
  };
  return { ctx, calls };
}

test('spawnParticles stores Vector3 positions and velocities', () => {
  const particles = [];
  spawnParticles(particles, 1024, 512, '#fff', 1, 0, 1);
  assert.equal(particles.length, 1);
  const p = particles[0];
  assert(p.position instanceof THREE.Vector3);
  assert(p.velocity instanceof THREE.Vector3);
  const expected = toCanvasPos(p.position);
  assert.equal(expected.x, 1024);
  assert.equal(expected.y, 512);
});

test('updateParticles projects 3D position to canvas', () => {
  const particles = [];
  spawnParticles(particles, 1024, 512, '#fff', 1, 0, 2);
  const { ctx, calls } = createCtx();
  updateParticles(ctx, particles);
  const arcCall = calls.find(c => typeof c === 'object');
  assert.deepEqual(arcCall, { x: 1024, y: 512, r: 3 });
  assert.equal(particles[0].life, 1);
  updateParticles(ctx, particles);
  assert.equal(particles.length, 0);
});
