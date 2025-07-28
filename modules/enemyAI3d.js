// modules/enemyAI3d.js
// -----------------------------------------------------------------------------
// Basic 3-D enemy movement helpers. Converts legacy 2-D enemy positions to
// vectors on the gameplay sphere and moves them toward the player avatar.
// This begins the port of enemy AI logic into fully 3-D aware components.

import { state } from './state.js';
import { uvToSpherePos, spherePosToUv } from './utils.js';
import { moveTowards } from './movement3d.js';
import { findPath, buildNavMesh } from './navmesh.js';


// Build the navmesh once on module import
buildNavMesh(2,1);

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
 * @param {THREE.Vector3} playerPos - Player position on the sphere.
 * @param {number} radius - Sphere radius.
 * @param {number} width  - Legacy canvas width.
 * @param {number} height - Legacy canvas height.
 */
export function updateEnemies3d(playerPos, radius, width, height){
  const targetUv = spherePosToUv(playerPos, radius);
  state.enemies.forEach(e => {
    const startUv = {u:e.x/width, v:e.y/height};
    const path = findPath(startUv, targetUv);
    const nextUv = path[1] || targetUv;
    const pos3d = uvToSpherePos(startUv.u, startUv.v, radius);
    const target3d = uvToSpherePos(nextUv.u, nextUv.v, radius);
    moveTowards(pos3d, target3d, e.speed || 1, radius);
    const {u,v} = spherePosToUv(pos3d, radius);
    e.x = u * width;
    e.y = v * height;
  });
}
