// modules/PowerManager.js
//
// Centralized management for power-up inventory and usage.
// Handles adding powers, consuming them, and applying associated effects.

import { state } from './state.js';
import { usePower, offensivePowers, powers } from './powers.js';
import { gameHelpers } from './gameHelpers.js';
import { playerHasCore } from './helpers.js';

function consumeFirstSlot(inventory) {
  inventory.shift();
  inventory.push(null);
}

/**
 * Attempt to add a power-up to the appropriate inventory queue.
 * If the queue is full and the player has the overload-protocol talent,
 * the power is automatically used as a free cast.
 * @param {string} powerKey
 * @returns {boolean} true if the power was added or auto-used
 */
export function addPowerToInventory(powerKey) {
  const isOffensive = offensivePowers.includes(powerKey);
  const inv = isOffensive ? state.offensiveInventory : state.defensiveInventory;
  const max = isOffensive ? state.player.unlockedOffensiveSlots : state.player.unlockedDefensiveSlots;
  const idx = inv.indexOf(null);

  if (idx !== -1 && idx < max) {
    inv[idx] = powerKey;
    if (gameHelpers.updateHud) gameHelpers.updateHud();
    return true;
  }

  if (state.player.purchasedTalents.has('overload-protocol')) {
    gameHelpers.addStatusEffect?.('Auto-Used', powers[powerKey]?.emoji || '?', 2000);
    usePower(powerKey, true);
    return true;
  }

  return false;
}

function useFromInventory(inventory, powerKey, options = {}) {
  let consumed = true;
  if (state.player.purchasedTalents.has('energetic-recycling') && Math.random() < 0.20) {
    consumed = false;
  }
  if (playerHasCore('singularity') && Math.random() < 0.15) {
    consumed = false;
  }
  if (!consumed) {
    gameHelpers.addStatusEffect?.('Recycled', '♻️', 2000);
  }

  usePower(powerKey, !consumed, options);

  if (consumed) {
    consumeFirstSlot(inventory);
  }

  if (gameHelpers.updateHud) gameHelpers.updateHud();
}

/**
 * Use the offensive power in the first inventory slot.
 * @param {object} [options]
 */
export function useOffensivePower(options = {}) {
  const key = state.offensiveInventory[0];
  if (key) {
    useFromInventory(state.offensiveInventory, key, options);
  }
}

/**
 * Use the defensive power in the first inventory slot.
 * @param {object} [options]
 */
export function useDefensivePower(options = {}) {
  const key = state.defensiveInventory[0];
  if (key) {
    useFromInventory(state.defensiveInventory, key, options);
  }
}

