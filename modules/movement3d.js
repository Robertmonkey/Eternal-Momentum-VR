// modules/movement3d.js – Momentum helper
// -----------------------------------------------------------------------------
// Moves an avatar smoothly across the inner surface of a sphere toward a
// target point.  Used for Nexus movement.  Algorithm unchanged; file included
// in full for completeness.  

import * as THREE from '../vendor/three.module.js';
import { spherePosToUv, uvToSpherePos } from './utils.js';

/**
 * Perform spherical linear interpolation (slerp) between two unit vectors.
 * @param {THREE.Vector3} start - Normalized start vector.
 * @param {THREE.Vector3} end - Normalized end vector.
 * @param {number} t - Interpolation factor in [0,1].
 * @returns {THREE.Vector3} Interpolated unit vector.
 */
function slerpUnitVectors (start, end, t) {
  const theta = start.angleTo(end);
  if (theta === 0) return start.clone();
  const sinTheta = Math.sin(theta);
  const coeffStart = Math.sin((1 - t) * theta) / sinTheta;
  const coeffEnd = Math.sin(t * theta) / sinTheta;
  return start.clone().multiplyScalar(coeffStart).add(end.clone().multiplyScalar(coeffEnd));
}

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
  // Normalising zero-length vectors results in NaNs which then propagate
  // through the cross‑product math and ultimately send agents flying toward
  // the poles. Guard against this by early‑returning a zero vector when either
  // endpoint is too close to the origin.
  if (!from || !to || from.lengthSq() < 1e-10 || to.lengthSq() < 1e-10) {
    return new THREE.Vector3(0, 0, 0);
  }

  const fromNorm = from.clone().normalize();
  const toNorm = to.clone().normalize();

  // The tangent direction is obtained by rotating the start vector toward the
  // target along the great-circle path. Using the cross-product twice avoids
  // numerical instability when the points are near-opposite, which previously
  // caused agents to drift toward the sphere's poles.
  const axis = new THREE.Vector3().crossVectors(fromNorm, toNorm);
  if (axis.lengthSq() < 1e-10) {
    // If the vectors are parallel or antiparallel, pick an arbitrary axis
    // orthogonal to the start vector.
    axis.set(0, 1, 0).cross(fromNorm);
    if (axis.lengthSq() < 1e-10) {
      axis.set(1, 0, 0).cross(fromNorm);
    }
  }
  // Normalize the axis so that the subsequent cross product produces a stable
  // unit-length tangent even when the original vectors are very close to being
  // parallel. Without this, extremely small axes could lead to precision
  // issues and erratic movement around the poles.
  axis.normalize();
  return new THREE.Vector3().crossVectors(axis, fromNorm).normalize();
}

// Clamp UV coordinates away from the poles where navigation math becomes
// unstable.  Keeping objects within this safe band prevents gradual drift
// toward the top or bottom of the sphere.
export const UV_EPSILON = 0.002;
export function sanitizeUv({ u, v } = { u: 0.5, v: 0.5 }) {
  // Guard against undefined or non-numeric inputs which previously produced
  // NaN values and allowed agents to drift toward the poles.  Falling back to
  // centre-of-sphere coordinates keeps callers robust.
  const safeU = Number.isFinite(u) ? (u % 1 + 1) % 1 : 0.5;
  // Wrap v into [0,1) before clamping so callers can pass negative or
  // oversized values (for example from noise functions) without breaking
  // navigation.  Without the wrap enemies could get stuck off the sphere.
  const wrappedV = Number.isFinite(v) ? (v % 1 + 1) % 1 : 0.5;
  return {
    u: safeU,
    v: Math.min(1 - UV_EPSILON, Math.max(UV_EPSILON, wrappedV)),
  };
}

/**
 * Move an avatar toward a target position on the sphere.
 * @param {THREE.Vector3} avatarPos  Current avatar position (mutated).
 * @param {THREE.Vector3} targetPos  Target point on the sphere.
 * @param {number}        speedMod   Player speed multiplier.
 * @param {number}        radius     Sphere radius.
 * @returns {{u:number,v:number}}    New (u,v) coords for legacy gameLoop.
 */
export function moveTowards(
  avatarPos,
  targetPos,
  speedMod = 1,
  radius = 1,
  deltaMs = 16
) {
  // Ignore requests with invalid timing or speed so callers can safely pass
  // uninitialised values without agents shooting across the arena.
  if (deltaMs <= 0 || speedMod <= 0) {
    return spherePosToUv(avatarPos, radius);
  }

  if (targetPos.lengthSq() < 1e-6) {
    // A zero-length target (e.g., the sphere's centre) would cause the
    // movement math to collapse and send the avatar toward a pole. When this
    // occurs simply hold position by returning the current coordinates.
    return spherePosToUv(avatarPos, radius);
  }

  // Constrain the target to the sphere and away from the poles so that we
  // always move along a well-defined great-circle path. Without this clamp the
  // default reset target at (0,0,0) would normalize to a pole and trap all
  // agents there.
  const safeUv = sanitizeUv(spherePosToUv(targetPos, radius));
  const safeTarget = uvToSpherePos(safeUv.u, safeUv.v, radius);

  const dist = avatarPos.distanceTo(safeTarget);
  if (Number.isFinite(dist) && dist > 1e-4) {
    const dir = getSphericalDirection(avatarPos, safeTarget);
    // Cap step length so extremely large deltas (e.g. a paused tab resuming)
    // cannot overshoot the target and oscillate around it.
    const step = Math.min(dist, dist * 0.015 * speedMod * (deltaMs / 16));
    avatarPos.add(dir.multiplyScalar(step));
    avatarPos.normalize().multiplyScalar(radius);

    // Sanitize position so that accumulated floating point error does not
    // push the avatar toward the poles over time.
    const uv = sanitizeUv(spherePosToUv(avatarPos, radius));
    avatarPos.copy(uvToSpherePos(uv.u, uv.v, radius));
  }
  return spherePosToUv(avatarPos, radius);
}
