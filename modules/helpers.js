import { state } from './state.js';
import { toCanvasPos, uvToSpherePos } from './utils.js';
import * as THREE from '../vendor/three.module.js';
import * as CoreManager from './CoreManager.js';

/**
 * Check if the player currently has the given core equipped or granted
 * via Pantheon buffs.
 * @param {string} coreId - Core identifier
 * @returns {boolean} True if the core is active
 */
export function playerHasCore(coreId){
  if (!coreId) return false;
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
  if (!obj) return { x: 0, y: 0 };
  if (obj.isVector3) {
    return toCanvasPos(obj);
  }
  if (obj.position && obj.position.isVector3){
    return toCanvasPos(obj.position);
  }
  const x = Number.isFinite(obj.x) ? obj.x : 0;
  const y = Number.isFinite(obj.y) ? obj.y : 0;
  return { x, y };
}

/**
 * Set an object's 3D position from canvas pixel coordinates.
 *
 * update.
 * @param {number} x - Canvas x coordinate in pixels.
 * @param {number} y - Canvas y coordinate in pixels.
 * @param {number} [width=2048] - Canvas width used for conversion.
 * @param {number} [height=1024] - Canvas height used for conversion.
 * @param {number} [radius=1] - Sphere radius for conversion.
 * @returns {THREE.Vector3} Updated position vector.
 */
export function setPositionFromCanvas(target, x, y, width = 2048, height = 1024, radius = 1){
  width = width > 0 ? width : 1;
  height = height > 0 ? height : 1;
  const clampedX = Math.min(width, Math.max(0, x));
  const clampedY = Math.min(height, Math.max(0, y));
  const u = ((clampedX / width) - 0.5 + 1) % 1;
  const v = clampedY / height;
  const vec = uvToSpherePos(u, v, radius);
  if (target && target.isVector3){
    return target.copy(vec);
  }
  if (target && target.position && target.position.isVector3){
    target.position.copy(vec);
    return target.position;
  }
  return vec;
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
  // Ignore non-numeric or negative inputs so callers can't accidentally heal
  // the player by passing a bad value. Previously NaN or negative damage could
  // bubble through the core hooks and produce strange side effects.
  let damage = Number.isFinite(amount) ? amount : 0;
  if (damage <= 0) return 0;

  // Phase Momentum negates contact damage from non-boss enemies
  const pmState = state.player.talent_states.phaseMomentum;
  if (pmState.active && (!source || !source.boss)) {
    pmState.lastDamageTime = Date.now();
    pmState.active = false;
    return 0;
  }

  // Allow cores and talents to react to the hit
  damage = CoreManager.onPlayerDamage(damage, source, gameHelpers);
  damage *= state.player.talent_modifiers.damage_taken_multiplier;

  if (damage <= 0) return 0;

  if (state.player.shield) {
    state.player.shield = false;
    state.player.shield_end_time = 0;
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
  if (state.player.health < 0) state.player.health = 0;

  return damage;
}

/**
 * Clamp a numeric value between a minimum and maximum.
 *
 * @param {number} value - The input number to clamp.
 * @param {number} min - Minimum allowed value.
 * @param {number} max - Maximum allowed value.
 * @returns {number} The clamped value.
 */
export function clamp(value, min, max) {
  if (min > max) [min, max] = [max, min];
  return Math.min(max, Math.max(min, value));
}

/**
 * Heal the player by a given amount while respecting max health.
 * Negative values are allowed and will reduce health.
 *
 * @param {number} amount - Amount of health to restore.
 * @returns {number} The player's updated health.
 */
export function applyPlayerHeal(amount) {
  const newHealth = clamp(state.player.health + amount, 0, state.player.maxHealth);
  state.player.health = newHealth;
  return newHealth;
}

/**
 * Insert line breaks so no line exceeds a maximum length.
 * Existing line breaks are preserved.
 * @param {string} text - Input text to wrap.
 * @param {number} [maxLen=60] - Maximum characters per line.
 * @returns {string} Wrapped text.
 */
export function wrapText(text, maxLen = 60) {
  if (!Number.isFinite(maxLen) || maxLen <= 0) {
    return String(text).trim();
  }
  maxLen = Math.max(1, Math.floor(maxLen));
  const lines = String(text).split('\n');
  return lines.map(line => {
    const words = line.split(' ');
    let result = '';
    let current = '';
    words.forEach(word => {
      const wordPart = word.length > maxLen ? word.match(new RegExp(`.{1,${maxLen}}`, 'g')) : [word];
      wordPart.forEach((part, idx) => {
        if ((current + part).length > maxLen) {
          result += current.trimEnd() + '\n';
          current = '';
        }
        current += part;
        if (idx < wordPart.length - 1) {
          result += current + '\n';
          current = '';
        } else {
          current += ' ';
        }
      });
    });
    return result + current.trimEnd();
  }).join('\n').trim();
}

/**
 * Recursively dispose of all geometries, materials and textures beneath the
 * given group and remove the children. Useful for clearing dynamic UI groups
 * without leaking GPU resources.
 *
 * @param {THREE.Object3D} group - Group whose descendants should be removed
 * and disposed.
 */
export function disposeGroupChildren(group) {
  if (!group || !group.children) return;
  while (group.children.length > 0) {
    const child = group.children[0];
    disposeGroupChildren(child);

    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(m => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      } else {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    }
    if (child.geometry) child.geometry.dispose();

    group.remove(child);
  }
}
