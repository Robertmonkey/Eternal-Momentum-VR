import test from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../modules/state.js';
import { applyPlayerDamage } from '../modules/helpers.js';
import * as CoreManager from '../modules/CoreManager.js';

// Stub core hooks for isolation
CoreManager._setTestHooks({
  onPlayerDamage: d => d,
  onShieldBreak: () => {},
  onFatalDamage: () => true,
});

test('applyPlayerDamage ignores negative or non-finite values', () => {
  state.player.health = 50;
  state.player.maxHealth = 100;
  state.player.shield = false;
  state.player.talent_states.phaseMomentum.active = false;
  state.player.talent_modifiers.damage_taken_multiplier = 1;
  const h = state.player.health;
  const dmg1 = applyPlayerDamage(NaN, null, {});
  const dmg2 = applyPlayerDamage(-10, null, {});
  assert.equal(dmg1, 0);
  assert.equal(dmg2, 0);
  assert.equal(state.player.health, h);
});
