// modules/movement3d.js
// Utility for movement along the gameplay sphere using the Momentum mechanic.
import { spherePosToUv } from './utils.js';

/**
 * Move an avatar toward a target position on the sphere.
 * @param {THREE.Vector3} avatarPos - Current avatar position (modified in place).
 * @param {THREE.Vector3} targetPos - Target point on the sphere surface.
 * @param {number} speedMod - Speed multiplier from player stats.
 * @param {number} radius - Sphere radius.
 * @returns {{u:number,v:number}} New UV coordinates on the sphere.
 */
export function moveTowards(avatarPos, targetPos, speedMod = 1, radius = 1) {
    const direction = targetPos.clone().sub(avatarPos);
    const dist = direction.length();
    if (dist > 0.0001) {
        direction.normalize();
        const velocity = direction.multiplyScalar(dist * 0.015 * speedMod);
        avatarPos.add(velocity);
        avatarPos.normalize().multiplyScalar(radius);
    }
    return spherePosToUv(avatarPos, radius);
}
