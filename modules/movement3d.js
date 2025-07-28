// modules/movement3d.js – Momentum helper
// -----------------------------------------------------------------------------
// Moves an avatar smoothly across the inner surface of a sphere toward a
// target point.  Used for Nexus movement.  Algorithm unchanged; file included
// in full for completeness.  

import { spherePosToUv } from './utils.js';

/**
 * Move an avatar toward a target position on the sphere.
 * @param {THREE.Vector3} avatarPos  Current avatar position (mutated).
 * @param {THREE.Vector3} targetPos  Target point on the sphere.
 * @param {number}        speedMod   Player speed multiplier.
 * @param {number}        radius     Sphere radius.
 * @returns {{u:number,v:number}}    New (u,v) coords for legacy gameLoop.
 */
export function moveTowards (avatarPos, targetPos, speedMod = 1, radius = 1) {
  const dir = targetPos.clone().sub(avatarPos);
  const dist = dir.length();
  if (dist > 1e‑4) {
    dir.normalize();
    avatarPos.add(dir.multiplyScalar(dist * 0.015 * speedMod));
    avatarPos.normalize().multiplyScalar(radius);
  }
  return spherePosToUv(avatarPos, radius);
}
