import { state } from './state.js';
import { toCanvasPos } from './utils.js';
import * as THREE from '../vendor/three.module.js';

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
