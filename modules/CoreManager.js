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

// Re-export other core hooks for convenience so modules can import
// from CoreManager instead of cores.js directly.
export const onEnemyDeath = Cores.handleCoreOnEnemyDeath;
export const onPlayerDamage = Cores.handleCoreOnPlayerDamage;
export const onCollision = Cores.handleCoreOnCollision;
export const onDamageDealt = Cores.handleCoreOnDamageDealt;
export const onShieldBreak = Cores.handleCoreOnShieldBreak;
export const onFatalDamage = Cores.handleCoreOnFatalDamage;
export const onPickup = Cores.handleCoreOnPickup;
export const onEmptySlot = Cores.handleCoreOnEmptySlot;
export const onDefensivePower = Cores.handleCoreOnDefensivePower;
