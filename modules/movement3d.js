// modules/movement3d.js – Momentum helper
// -----------------------------------------------------------------------------
// Moves an avatar smoothly across the inner surface of a sphere toward a
// target point.  Used for Nexus movement.  Algorithm unchanged; file included
// in full for completeness.  

import * as THREE from '../vendor/three.module.js';
import { spherePosToUv } from './utils.js';

/**
 * Compute the tangent direction along the surface of a sphere from one point
 * to another. Both inputs are treated as positions on the sphere and the
 * resulting vector lies tangent to the sphere at the start point.
 *
 * @param {THREE.Vector3} from - Starting position on the sphere.
 * @param {THREE.Vector3} to   - Destination position on the sphere.
 * @returns {THREE.Vector3} Normalized direction vector along the sphere.
 */
export function getSphericalDirection(from, to) {
  const fromNorm = from.clone().normalize();
  const toNorm = to.clone().normalize();
  // Step a small amount along the great-circle arc toward the target using
  // spherical linear interpolation.
  const intermediate = fromNorm.clone().slerp(toNorm, 0.01);
  return intermediate.sub(fromNorm).normalize();
}

/**
 * Move an avatar toward a target position on the sphere.
 * @param {THREE.Vector3} avatarPos  Current avatar position (mutated).
 * @param {THREE.Vector3} targetPos  Target point on the sphere.
 * @param {number}        speedMod   Player speed multiplier.
 * @param {number}        radius     Sphere radius.
 * @returns {{u:number,v:number}}    New (u,v) coords for legacy gameLoop.
 */
export function moveTowards (avatarPos, targetPos, speedMod = 1, radius = 1) {
  const dist = avatarPos.distanceTo(targetPos);
  if (dist > 1e-4) {
    const dir = getSphericalDirection(avatarPos, targetPos);
    avatarPos.add(dir.multiplyScalar(dist * 0.015 * speedMod));
    avatarPos.normalize().multiplyScalar(radius);
  }
  return spherePosToUv(avatarPos, radius);
}
