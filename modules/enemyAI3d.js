// modules/enemyAI3d.js
// -----------------------------------------------------------------------------
// Basic 3-D enemy movement helpers. Converts legacy 2-D enemy positions to
// vectors on the gameplay sphere and moves them toward the player avatar.
// This begins the port of enemy AI logic into fully 3-D aware components.

import { state } from './state.js';
import { uvToSpherePos, spherePosToUv } from './utils.js';
import { moveTowards } from './movement3d.js';

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
  state.enemies.forEach(e => {
    const pos3d = uvToSpherePos(e.x / width, e.y / height, radius);
    moveTowards(pos3d, playerPos, e.speed || 1, radius);
    const {u,v} = spherePosToUv(pos3d, radius);
    e.x = u * width;
    e.y = v * height;
  });
}
