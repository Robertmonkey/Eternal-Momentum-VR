import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnParticles } from '../modules/utils.js';
import { state } from '../modules/state.js';

test('spawnParticles scales emission by density setting', () => {
  const particles = [];
  state.settings.particleDensity = 0.5;
  spawnParticles(particles, 1024, 512, '#fff', 10, 2, 5);
  assert.equal(particles.length, 5, 'half density halves the spawn count');

  const none = [];
  state.settings.particleDensity = 0;
  spawnParticles(none, 1024, 512, '#fff', 10, 2, 5);
  assert.equal(none.length, 0, 'zero density skips spawns');

  const full = [];
  state.settings.particleDensity = 1;
  spawnParticles(full, 1024, 512, '#fff', 4, 2, 5);
  assert.equal(full.length, 4, 'full density preserves expected count');
});
