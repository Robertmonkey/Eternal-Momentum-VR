import test from 'node:test';
import assert from 'node:assert/strict';

import { MiasmaAI } from '../modules/agents/MiasmaAI.js';
import { state } from '../modules/state.js';
import { gameHelpers } from '../modules/gameHelpers.js';

test('miasma slam uses current time when purifying vents', () => {
  // Prepare stubbed time and timers
  const originalDateNow = Date.now;
  const originalSetTimeout = global.setTimeout;
  let currentTime = 0;
  Date.now = () => currentTime;

  // Stub gameHelpers to avoid side effects
  gameHelpers.play = () => {};

  // Replace setTimeout to run instantly while advancing time
  global.setTimeout = (fn, ms) => {
    currentTime += ms;
    fn();
    return 0;
  };

  // Reset state and create boss
  state.effects = [];
  const boss = new MiasmaAI();
  boss.isGasActive = true;
  boss.position.copy(boss.vents[0].position.clone());

  // Trigger the slam
  boss.update(0);

  // After the instant timeout, the cooldown and timestamps should use advanced time
  assert.equal(boss.isChargingSlam, false);
  assert.equal(boss.isGasActive, false);
  assert.equal(boss.lastGasAttack, currentTime);
  assert.equal(boss.vents[0].cooldownUntil, currentTime + 10000);

  // Restore globals
  Date.now = originalDateNow;
  global.setTimeout = originalSetTimeout;
  state.effects = [];
  delete gameHelpers.play;
});

