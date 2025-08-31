import test from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../modules/state.js';
import { applyPlayerDamage } from '../modules/helpers.js';
import * as CoreManager from '../modules/CoreManager.js';

CoreManager._setTestHooks({
  onPlayerDamage: d => d,
  onShieldBreak: () => {},
  onFatalDamage: () => true,
});

test('applyPlayerDamage triggers haptic pulse', () => {
  state.player.health = 50;
  state.player.maxHealth = 100;
  state.player.shield = false;
  state.player.talent_states.phaseMomentum.active = false;
  state.player.talent_modifiers.damage_taken_multiplier = 1;
  let called = false;
  const helpers = {
    play: () => {},
    pulseControllers: (duration, intensity) => {
      called = true;
      assert.ok(duration > 0);
      assert.ok(intensity > 0);
    }
  };
  applyPlayerDamage(5, null, helpers);
  assert.ok(called);
});
