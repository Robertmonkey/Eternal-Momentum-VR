import test from 'node:test';
import assert from 'node:assert/strict';
import { pulseControllers } from '../modules/gameLoop.js';
import { state } from '../modules/state.js';

test('pulseControllers respects comfort settings', () => {
  let pulses = 0;
  let lastArgs = [];
  const actuator = { pulse: (...args) => { pulses++; lastArgs = args; } };
  const controller = { gamepad: { hapticActuators: [actuator] } };

  state.settings.hapticsEnabled = false;
  state.settings.hapticsStrength = 1;
  pulseControllers(30, 0.8, [controller]);
  assert.equal(pulses, 0, 'should not pulse when haptics disabled');

  state.settings.hapticsEnabled = true;
  state.settings.hapticsStrength = 0.5;
  pulseControllers(20, 1, [controller]);
  assert.equal(pulses, 1, 'should pulse when enabled');
  assert.equal(lastArgs[0], 0.5, 'intensity scales with user strength');
  assert.equal(lastArgs[1], 20, 'duration forwarded to actuator');
});
