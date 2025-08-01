// modules/enemyAI3d.js
// -----------------------------------------------------------------------------
// Basic 3-D enemy movement helpers. Converts legacy 2-D enemy positions to
// vectors on the gameplay sphere and moves them toward the player avatar.
// This begins the port of enemy AI logic into fully 3-D aware components.

import { state } from './state.js';
import { uvToSpherePos, spherePosToUv } from './utils.js';
import { moveTowards } from './movement3d.js';
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

export function updateEnemies3d(radius = DEFAULT_RADIUS, width, height){
  const now = Date.now();
  const playerPos = state.player.position.clone();
  const targetUv = spherePosToUv(playerPos, radius);
  state.enemies.forEach(e => {
    if(e.frozenUntil && now > e.frozenUntil){
      e.frozen = false;
      e.frozenUntil = null;
    }

    const startUv = spherePosToUv(e.position, radius);

    // Recalculate the full path periodically or when we reach the end
    if(!e.path || !e.path.length || e.pathIndex >= e.path.length || (e.lastPathCalc && Date.now()-e.lastPathCalc>500)){
      e.path = findPath(startUv, targetUv);
      e.pathIndex = 1;
      e.lastPathCalc = Date.now();
    }

    const nextUv = e.path[e.pathIndex] || targetUv;
    const pos3d = e.position.clone();
    const target3d = uvToSpherePos(nextUv.u, nextUv.v, radius);

    if(!e.frozen){
      moveTowards(pos3d, target3d, e.speed || 1, radius);
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
