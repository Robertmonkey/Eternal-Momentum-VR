// modules/enemyAI3d.js
// -----------------------------------------------------------------------------
// Basic 3-D enemy movement helpers. Converts legacy 2-D enemy positions to
// vectors on the gameplay sphere and moves them toward the player avatar.
// This begins the port of enemy AI logic into fully 3-D aware components.

import { state } from './state.js';
import { getSphericalDirection, sanitizeUv, moveTowards } from './movement3d.js';
import { updateAgentAnimation } from './agentAnimations.js';
import { findPath } from './navmesh.js';
import { spherePosToUv, uvToSpherePos } from './utils.js';

export function addPathObstacle(u, v, radius = 0.1) {
  // Normalise obstacle coordinates so callers can pass loose UV values.
  const safe = sanitizeUv({ u, v });
  state.pathObstacles.push({ u: safe.u, v: safe.v, radius });
}

export function clearPathObstacles(){
  state.pathObstacles.length = 0;
}

/**
 * Update all enemies by moving them slightly toward the player on the
 * sphere's surface. This preserves existing 2-D behaviour while ensuring
 * enemies respect the 3-D battlefield.
 *
 * @param {number} radius - Sphere radius.
 * @param {number} width  - Legacy canvas width.
 * @param {number} height - Legacy canvas height.
 * @param {number} deltaMs - Time since last frame in milliseconds.
 */
const DEFAULT_RADIUS = 50;
const PATH_RECALC_INTERVAL = 500; // ms between navmesh refresh attempts
const PATH_GOAL_EPSILON = 0.02;   // UV distance before we consider the goal changed
const PATH_POINT_THRESHOLD = 0.05; // fraction of radius used to advance to the next waypoint

function uvDistance(a = { u: 0, v: 0 }, b = { u: 0, v: 0 }) {
  const du = Math.abs(a.u - b.u);
  const dv = Math.abs(a.v - b.v);
  const wrapU = Math.min(du, 1 - du);
  const wrapV = Math.min(dv, 1 - dv);
  return Math.hypot(wrapU, wrapV);
}

function shouldUseNavPath(enemy, playerDir) {
  if (!enemy || !playerDir) return false;
  if (enemy.forceNavPath) return true;
  if (state.pathObstacles.length > 0) return true;
  const currentDir = enemy.position?.clone()?.normalize();
  if (!currentDir) return false;
  // When the enemy and player are nearly antipodal the simple cross-product
  // steering becomes numerically unstable and agents tended to drift toward
  // the poles. Falling back to the navmesh in that case produces a great
  // circle path that hugs the arena instead of spiking vertically.
  return currentDir.dot(playerDir) < -0.6;
}

function ensureNavPath(enemy, radius, playerPos, now) {
  if (!enemy || !playerPos) return null;
  const playerDir = playerPos.clone().normalize();
  const useNav = shouldUseNavPath(enemy, playerDir) || enemy.navPath?.length;
  if (!useNav) {
    enemy.navPath = null;
    enemy.navPathGoal = null;
    enemy.navPathIndex = 0;
    return null;
  }

  const startUv = spherePosToUv(enemy.position.clone().normalize(), 1);
  const goalUv = spherePosToUv(playerDir, 1);
  const needsRefresh =
    !enemy.navPath ||
    !enemy.navPathGoal ||
    uvDistance(enemy.navPathGoal, goalUv) > PATH_GOAL_EPSILON ||
    (now - (enemy.navPathUpdated || 0)) > PATH_RECALC_INTERVAL;

  if (needsRefresh) {
    const rawPath = findPath(startUv, goalUv);
    const navPoints = rawPath.map(({ u, v }) => uvToSpherePos(u, v, radius));
    enemy.navPath = navPoints;
    enemy.navPathGoal = goalUv;
    enemy.navPathIndex = navPoints.length > 1 ? 1 : 0;
    enemy.navPathUpdated = now;
  }

  if (!enemy.navPath || enemy.navPath.length === 0) {
    enemy.navPath = null;
    enemy.navPathGoal = null;
    enemy.navPathIndex = 0;
    return null;
  }

  const index = Math.max(0, Math.min(enemy.navPathIndex || 0, enemy.navPath.length - 1));
  enemy.navPathIndex = index;
  return enemy.navPath[index];
}

export function updateEnemies3d(radius = DEFAULT_RADIUS, width, height, deltaMs = 16){
  const now = Date.now();
  if (!Array.isArray(state.enemies) || !state.player) return;
  // Keep the player anchored to the sphere's surface.
  state.player.position.normalize().multiplyScalar(radius);

  state.enemies.forEach(e => {
    // Some systems leave defeated enemies in the array for clean-up. Skip any
    // entity explicitly marked as not alive so they don't continue to track the
    // player or consume CPU.
    if (!e || e.alive === false || !e.position) return;

    if (typeof e.update === 'function') {
      e.update(deltaMs);
    }
    updateAgentAnimation(e, deltaMs);
    if(e.frozenUntil && now > e.frozenUntil){
      e.frozen = false;
      e.frozenUntil = null;
    }

    // Ensure each enemy stays on the sphere.
    e.position.normalize().multiplyScalar(radius);

    const target3d = state.player.position.clone();
    const navTarget = ensureNavPath(e, radius, target3d, now);
    const movementTarget = navTarget || target3d;

    if(!e.customMovement && !e.frozen){
      const speed = typeof e.speed === 'number' && e.speed > 0 ? e.speed : 1;
      moveTowards(e.position, movementTarget, speed, radius, deltaMs);
      if (navTarget && e.navPath) {
        const reached = e.position.distanceTo(navTarget) < radius * PATH_POINT_THRESHOLD;
        if (reached) {
          if (e.navPathIndex < e.navPath.length - 1) {
            e.navPathIndex += 1;
          } else {
            e.navPath = null;
            e.navPathGoal = null;
            e.navPathIndex = 0;
          }
        }
      }
      if (typeof e.lookAt === 'function') {
        const faceDir = getSphericalDirection(e.position, movementTarget);
        e.lookAt(e.position.clone().add(faceDir));
      }
    }
  });

  // Prevent enemies from stacking on top of each other by applying a simple
  // separation step after all movement has been processed. This nudges any
  // overlapping pairs away from one another while keeping them on the
  // spherical arena.
  for(let i = 0; i < state.enemies.length; i++){
    const a = state.enemies[i];
    if(!a || a.alive === false || !a.position) continue;
    for(let j = i + 1; j < state.enemies.length; j++){
      const b = state.enemies[j];
      if(!b || b.alive === false || !b.position) continue;
      const minDist = (a.r || 0.5) + (b.r || 0.5);
      const dist = a.position.distanceTo(b.position);
      if(dist > 0 && dist < minDist){
        const overlap = minDist - dist;
        const dir = b.position.clone().sub(a.position).normalize();
        a.position.add(dir.clone().multiplyScalar(-overlap / 2));
        b.position.add(dir.clone().multiplyScalar(overlap / 2));
        a.position.normalize().multiplyScalar(radius);
        b.position.normalize().multiplyScalar(radius);
      }
    }
  }

  const fields = state.effects.filter(f => f.type === 'repulsion_field');
  fields.forEach(field => {
    field.position.copy(state.player.position);
    const overloaded = field.isOverloaded && Date.now() < field.startTime + 2000;
    state.enemies.forEach(enemy => {
      if (enemy.boss && enemy.kind !== 'fractal_horror') return;
      const dist = enemy.position.distanceTo(field.position);
      if (dist < field.radius) {
        const dir = enemy.position.clone().sub(field.position).normalize();
        const push = overloaded && !field.hitEnemies.has(enemy) ? 2 : 0.3;
        enemy.position.add(dir.multiplyScalar(push));
        enemy.position.normalize().multiplyScalar(radius);
        if (overloaded) field.hitEnemies.add(enemy);
      }
    });
    if (Date.now() > field.endTime) {
      const idx = state.effects.indexOf(field);
      if (idx !== -1) state.effects.splice(idx, 1);
    }
  });
}
