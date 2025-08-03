// modules/PowerManager.js
//
// Central manager for triggering offensive and defensive powers.
// Exposes simple wrapper functions used by the PlayerController
// so input handling doesn't need to know about inventory slots.

import { state } from './state.js';
import { usePower } from './powers.js';
import { gameHelpers } from './gameHelpers.js';

/**
 * Use the offensive power in the first inventory slot.
 * @param {object} [options] optional parameters passed to the power
 */
export function useOffensivePower(options = {}) {
  const key = state.offensiveInventory[0];
  if (key) {
    usePower(key, false, options);
    if (gameHelpers.updateHud) gameHelpers.updateHud();
  }
}

/**
 * Use the defensive power in the first inventory slot.
 * @param {object} [options] optional parameters passed to the power
 */
export function useDefensivePower(options = {}) {
  const key = state.defensiveInventory[0];
  if (key) {
    usePower(key, false, options);
    if (gameHelpers.updateHud) gameHelpers.updateHud();
  }
}
