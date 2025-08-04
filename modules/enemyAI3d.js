// modules/enemyAI3d.js
// -----------------------------------------------------------------------------
// Basic 3-D enemy movement helpers. Converts legacy 2-D enemy positions to
// vectors on the gameplay sphere and moves them toward the player avatar.
// This begins the port of enemy AI logic into fully 3-D aware components.

import { state } from './state.js';
import { uvToSpherePos, spherePosToUv } from './utils.js';
import { getSphericalDirection, sanitizeUv, moveTowards } from './movement3d.js';

export function addPathObstacle(u,v,radius=0.1){
  state.pathObstacles.push({u,v,radius});
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

// Clamp UV coordinates to keep enemies away from the poles where navigation
// math becomes unstable.  This prevents enemies from drifting toward the top
// or bottom of the sphere when their pathing data contains values at the
// extremes of the v range [0,1].
export function updateEnemies3d(radius = DEFAULT_RADIUS, width, height, deltaMs = 16){
  const now = Date.now();
  // Sanitize the player's position to keep the target away from the poles.
  const playerUv = sanitizeUv(spherePosToUv(state.player.position, radius));
  state.player.position.copy(uvToSpherePos(playerUv.u, playerUv.v, radius));

  state.enemies.forEach(e => {
    if (typeof e.update === 'function') {
      e.update(deltaMs);
    }
    if(e.frozenUntil && now > e.frozenUntil){
      e.frozen = false;
      e.frozenUntil = null;
    }

    // Snap enemies to a safe latitude to prevent gradual drift toward the poles.
    const startUv = sanitizeUv(spherePosToUv(e.position, radius));
    e.position.copy(uvToSpherePos(startUv.u, startUv.v, radius));

    const target3d = state.player.position.clone();

    if(!e.customMovement && !e.frozen){
      moveTowards(e.position, target3d, e.speed || 1, radius, deltaMs);
      const faceDir = getSphericalDirection(e.position, target3d);
      e.lookAt(e.position.clone().add(faceDir));
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
        if (overloaded) field.hitEnemies.add(enemy);
      }
    });
    if (Date.now() > field.endTime) {
      const idx = state.effects.indexOf(field);
      if (idx !== -1) state.effects.splice(idx, 1);
    }
  });
}
