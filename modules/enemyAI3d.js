// modules/enemyAI3d.js
// -----------------------------------------------------------------------------
// Basic 3-D enemy movement helpers. Converts legacy 2-D enemy positions to
// vectors on the gameplay sphere and moves them toward the player avatar.
// This begins the port of enemy AI logic into fully 3-D aware components.

import { state } from './state.js';
import { getSphericalDirection, sanitizeUv, moveTowards } from './movement3d.js';

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
    if(e.frozenUntil && now > e.frozenUntil){
      e.frozen = false;
      e.frozenUntil = null;
    }

    // Ensure each enemy stays on the sphere.
    e.position.normalize().multiplyScalar(radius);

    const target3d = state.player.position.clone();

    if(!e.customMovement && !e.frozen){
      const speed = typeof e.speed === 'number' && e.speed > 0 ? e.speed : 1;
      moveTowards(e.position, target3d, speed, radius, deltaMs);
      if (typeof e.lookAt === 'function') {
        const faceDir = getSphericalDirection(e.position, target3d);
        e.lookAt(e.position.clone().add(faceDir));
      }
    }
  });

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
