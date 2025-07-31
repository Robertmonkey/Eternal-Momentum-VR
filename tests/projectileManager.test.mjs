import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};
const { spawnProjectile, updateProjectiles, getActiveProjectiles, resetProjectiles } = await import('../modules/ProjectileManager.js');

const target = { position: new THREE.Vector3(2, 0, 0), r: 1, hp: 3 };

const first = spawnProjectile({ position: new THREE.Vector3(0,0,0), velocity: new THREE.Vector3(1,0,0), r: 0.5, damage: 1 });

function step(p) {
  p.position.add(p.velocity);
}

function collide(p) {
  const dx = p.position.x - target.position.x;
  const dy = p.position.y - target.position.y;
  const dz = p.position.z - target.position.z;
  if (Math.hypot(dx, dy, dz) < p.r + target.r) {
    target.hp -= p.damage;
    return true;
  }
  return false;
}

updateProjectiles(step, collide);
updateProjectiles(step, collide);

assert.strictEqual(getActiveProjectiles().length, 0, 'Projectile removed after collision');
assert.strictEqual(target.hp, 2, 'Target took damage');

const reused = spawnProjectile({ position: new THREE.Vector3(0,0,0), velocity: new THREE.Vector3(1,0,0), r: 0.5, damage: 1 });
assert.strictEqual(reused, first, 'Reused pooled projectile');

resetProjectiles();
assert.strictEqual(getActiveProjectiles().length, 0, 'Manager reset clears active projectiles');

console.log('projectileManager tests passed');
