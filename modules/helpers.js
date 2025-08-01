import { state } from './state.js';
import { toCanvasPos } from './utils.js';
import * as THREE from '../vendor/three.module.js';
import * as CoreManager from './CoreManager.js';

/**
 * Check if the player currently has the given core equipped or granted
 * via Pantheon buffs.
 * @param {string} coreId - Core identifier
 * @returns {boolean} True if the core is active
 */
export function playerHasCore(coreId){
  if (state.player.equippedAberrationCore === coreId) return true;
  return state.player.activePantheonBuffs.some(buff => buff.coreId === coreId);
}

/**
 * Convert an object with a Vector3 position or x/y fields to canvas
 * coordinates in pixels.
 * @param {{position?:THREE.Vector3,x?:number,y?:number}} obj
 * @returns {{x:number,y:number}}
 */
export function getCanvasPos(obj){
  if (obj.position && obj.position.isVector3){
    return toCanvasPos(obj.position);
  }
  return { x: obj.x, y: obj.y };
}

/**
 * Apply damage to the player while accounting for talent and core effects.
 * This centralizes collision damage logic so talents like Phase Momentum,
 * Reactive Plating and Contingency Protocol behave identically to the
 * original game.
 *
 * @param {number} amount - Base damage to apply.
 * @param {Object} [source] - The enemy or object dealing damage.
 * @param {Object} [gameHelpers] - Optional helper functions for SFX/UI.
 * @returns {number} The final damage applied after modifiers.
 */
export function applyPlayerDamage(amount, source = null, gameHelpers = {}) {
  let damage = amount;

  // Phase Momentum negates contact damage from non-boss enemies
  const pmState = state.player.talent_states.phaseMomentum;
  if (pmState.active && (!source || !source.boss)) {
    pmState.lastDamageTime = Date.now();
    pmState.active = false;
    return 0;
  }

  // Allow cores and talents to react to the hit
  if (damage > 0) {
    damage = CoreManager.onPlayerDamage(damage, source, gameHelpers);
    damage *= state.player.talent_modifiers.damage_taken_multiplier;
  }

  if (damage <= 0) return 0;

  if (state.player.shield) {
    state.player.shield = false;
    CoreManager.onShieldBreak();
    return 0;
  }

  const newHealth = state.player.health - damage;
  if (newHealth <= 0) {
    if (!CoreManager.onFatalDamage(source, gameHelpers)) {
      state.player.health = 0;
      state.gameOver = true;
    }
  } else {
    state.player.health = newHealth;
  }

  return damage;
}
