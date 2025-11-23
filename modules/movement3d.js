// modules/movement3d.js – Momentum helper
// -----------------------------------------------------------------------------
// Reworked spherical movement helpers that operate purely on 3‑D vectors. The
// original port constantly converted positions to UV coordinates and clamped
// them away from the poles, which produced visible snapping as agents crossed
// the seams.  The new system keeps everything in Cartesian space and moves
// objects by rotating them along great‑circle arcs.  UV coordinates are now
// only returned when explicitly requested by legacy callers.

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

// Wrap UV coordinates into [0,1).  Older builds clamped values away from the
// poles which caused snapping.  The new helper simply normalises the range so
// callers can supply loose coordinates without affecting gameplay.
export function sanitizeUv({ u, v } = { u: 0.5, v: 0.5 }) {
  const safeU = Number.isFinite(u) ? (u % 1 + 1) % 1 : 0.5;
  // V represents latitude; wrapping it causes south‑pole values (v≈1) to jump
  // back to the north pole (v≈0). Clamp instead of wrapping so agents never
  // request nav paths that teleport across hemispheres and trigger pole
  // spikes. Keep a tiny buffer away from 0/1 to avoid precision issues.
  const clampedV = Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 0.5;
  const safeV = Math.min(0.998, Math.max(0.002, clampedV));
  return { u: safeU, v: safeV };
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
  if (!avatarPos || !targetPos || deltaMs <= 0 || speedMod <= 0) {
    return spherePosToUv(avatarPos, radius);
  }

  // Normalise inputs so we can work with pure directions.
  const from = avatarPos.clone().normalize();
  const to = targetPos.clone().normalize();

  const angle = from.angleTo(to);
  if (!Number.isFinite(angle) || angle < 1e-5) {
    // If the target is extremely close, simply snap back to the sphere.
    avatarPos.copy(from.multiplyScalar(radius));
    return spherePosToUv(avatarPos, radius);
  }

  const step = Math.min(
    angle,
    angle * 0.015 * speedMod * (deltaMs / 16)
  );

  let axis = new THREE.Vector3().crossVectors(from, to);
  if (axis.lengthSq() < 1e-10) {
    // Choose an arbitrary axis orthogonal to the current position when the
    // start and target are parallel or antiparallel.
    axis = new THREE.Vector3(0, 1, 0).cross(from);
    if (axis.lengthSq() < 1e-10) {
      axis = new THREE.Vector3(1, 0, 0).cross(from);
    }
  }
  axis.normalize();

  avatarPos.applyAxisAngle(axis, step);
  avatarPos.normalize().multiplyScalar(radius);

  return spherePosToUv(avatarPos, radius);
}
