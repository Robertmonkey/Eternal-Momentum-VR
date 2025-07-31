// modules/CoreManager.js
//
// Wrapper around aberration core logic. Provides a central API for
// triggering core actives and updating passive effects each frame.
// This mirrors the behaviour of the original game but exposes simple
// functions used by the VR game loop and input handlers.

import { state } from './state.js';
import * as Cores from './cores.js';
import { spherePosToUv } from './utils.js';

const SCREEN_WIDTH = 2048;
const SCREEN_HEIGHT = 1024;

/**
 * Activate the currently equipped core's active ability using the
 * cursor location stored in state. Input handlers should call this
 * when the player presses both trigger and grip.
 */
export function useCoreActive(gameHelpers) {
  const uv = spherePosToUv(state.mousePosition.clone().normalize(), 1);
  Cores.activateCorePower(uv.u * SCREEN_WIDTH, uv.v * SCREEN_HEIGHT, gameHelpers);
}

/**
 * Apply all passive core behaviours. Should be called once per frame
 * from the main game loop.
 */
export function applyCorePassives(gameHelpers) {
  Cores.applyCoreTickEffects(gameHelpers);
}

// Allow tests to override hook functions by updating this object.
const hooks = {
  onEnemyDeath: Cores.handleCoreOnEnemyDeath,
  onPlayerDamage: Cores.handleCoreOnPlayerDamage,
  onCollision: Cores.handleCoreOnCollision,
  onDamageDealt: Cores.handleCoreOnDamageDealt,
  onShieldBreak: Cores.handleCoreOnShieldBreak,
  onFatalDamage: Cores.handleCoreOnFatalDamage,
  onPickup: Cores.handleCoreOnPickup,
  onEmptySlot: Cores.handleCoreOnEmptySlot,
  onDefensivePower: Cores.handleCoreOnDefensivePower,
};

export function _setTestHooks(overrides = {}) {
  Object.assign(hooks, overrides);
}

export const onEnemyDeath = (...args) => hooks.onEnemyDeath(...args);
export const onPlayerDamage = (...args) => hooks.onPlayerDamage(...args);
export const onCollision = (...args) => hooks.onCollision(...args);
export const onDamageDealt = (...args) => hooks.onDamageDealt(...args);
export const onShieldBreak = (...args) => hooks.onShieldBreak(...args);
export const onFatalDamage = (...args) => hooks.onFatalDamage(...args);
export const onPickup = (...args) => hooks.onPickup(...args);
export const onEmptySlot = (...args) => hooks.onEmptySlot(...args);
export const onDefensivePower = (...args) => hooks.onDefensivePower(...args);
