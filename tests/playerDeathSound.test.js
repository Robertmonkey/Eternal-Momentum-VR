import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

import { applyPlayerDamage } from '../modules/helpers.js';
import { state } from '../modules/state.js';

test('player death triggers hitSound', () => {
  state.player.health = 5;
  state.player.shield = false;
  state.gameOver = false;
  const helpers = { play: mock.fn() };
  applyPlayerDamage(10, null, helpers);
  assert.equal(helpers.play.mock.calls[0].arguments[0], 'hitSound');
  assert.ok(state.gameOver, 'game over triggered');
});
