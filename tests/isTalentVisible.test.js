import test from 'node:test';
import assert from 'node:assert/strict';
import { isTalentVisible } from '../modules/ascension.js';
import { TALENT_GRID_CONFIG } from '../modules/talents.js';
import { state } from '../modules/state.js';

test('isTalentVisible handles array unlockedPowers', () => {
  const original = state.player.unlockedPowers;
  state.player.unlockedPowers = ['heal', 'missile'];
  const talent = TALENT_GRID_CONFIG.core['core-nexus'];
  assert.equal(isTalentVisible(talent), true);
  state.player.unlockedPowers = original;
});
