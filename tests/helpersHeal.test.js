import test from 'node:test';
import assert from 'node:assert/strict';

const { clamp, applyPlayerHeal } = await import('../modules/helpers.js');
const { state } = await import('../modules/state.js');

// Reset player health/max for test isolation
state.player.maxHealth = 100;
state.player.health = 50;


test('clamp constrains values within range', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(15, 0, 10), 10);
});

test('applyPlayerHeal respects maximum health and allows reduction', () => {
  applyPlayerHeal(60);
  assert.equal(state.player.health, 100);
  applyPlayerHeal(-30);
  assert.equal(state.player.health, 70);
});
