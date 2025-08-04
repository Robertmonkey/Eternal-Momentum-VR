// modules/enemyAI3d.js
// -----------------------------------------------------------------------------
// Basic 3-D enemy movement helpers. Converts legacy 2-D enemy positions to
// vectors on the gameplay sphere and moves them toward the player avatar.
// This begins the port of enemy AI logic into fully 3-D aware components.

import { state } from './state.js';
import { uvToSpherePos, spherePosToUv } from './utils.js';
import { getSphericalDirection } from './movement3d.js';
import { findPath, buildNavMesh } from './navmesh.js';

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
 */
const DEFAULT_RADIUS = 50;

// Clamp UV coordinates to keep enemies away from the poles where navigation
// math becomes unstable.  This prevents enemies from drifting toward the top
// or bottom of the sphere when their pathing data contains values at the
// extremes of the v range [0,1].
const UV_EPSILON = 0.002;
function sanitizeUv({u, v}){
  return {
    u: (u % 1 + 1) % 1,
    v: Math.min(1 - UV_EPSILON, Math.max(UV_EPSILON, v))
  };
}

export function updateEnemies3d(radius = DEFAULT_RADIUS, width, height){
  const now = Date.now();
  const playerPos = state.player.position.clone();
  const targetUv = sanitizeUv(spherePosToUv(playerPos, radius));
  state.enemies.forEach(e => {
    if(e.frozenUntil && now > e.frozenUntil){
      e.frozen = false;
      e.frozenUntil = null;
    }

    const startUv = sanitizeUv(spherePosToUv(e.position, radius));

    // Recalculate the path when the player moves or after a timeout
    const moved = !e.lastPlayerUv ||
      Math.abs(e.lastPlayerUv.u - targetUv.u) > 0.002 ||
      Math.abs(e.lastPlayerUv.v - targetUv.v) > 0.002;
    if(moved || !e.path || !e.path.length || e.pathIndex >= e.path.length ||
       (e.lastPathCalc && Date.now()-e.lastPathCalc>500)){
      e.path = findPath(startUv, targetUv);
      e.pathIndex = 1;
      e.lastPathCalc = Date.now();
      e.lastPlayerUv = { u: targetUv.u, v: targetUv.v };
    }

    const nextUv = sanitizeUv(e.path[e.pathIndex] || targetUv);
    const pos3d = e.position.clone();
    const target3d = uvToSpherePos(nextUv.u, nextUv.v, radius);

    if(!e.frozen){
      const dir = getSphericalDirection(pos3d, target3d);
      const dist = pos3d.distanceTo(target3d);
      pos3d.add(dir.multiplyScalar(dist * 0.015 * (e.speed || 1)));
      pos3d.normalize().multiplyScalar(radius);
      e.lookAt(pos3d.clone().add(dir));
      // Advance along the path when close to the next waypoint
      const dest3d = uvToSpherePos(nextUv.u, nextUv.v, radius);
      if(pos3d.distanceTo(dest3d) < 0.05*radius){
        e.pathIndex++;
      }
    }

    e.position.copy(pos3d);
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
