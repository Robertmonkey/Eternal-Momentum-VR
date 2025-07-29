import assert from 'assert';
import { spawnProjectile, updateProjectiles, getActiveProjectiles, resetProjectiles } from '../modules/ProjectileManager.js';

const target = { x: 2, y: 0, r: 1, hp: 3 };

const first = spawnProjectile({ x: 0, y: 0, dx: 1, dy: 0, r: 0.5, damage: 1 });

function step(p) {
  p.x += p.dx;
  p.y += p.dy;
}

function collide(p) {
  const dx = p.x - target.x;
  const dy = p.y - target.y;
  if (Math.hypot(dx, dy) < p.r + target.r) {
    target.hp -= p.damage;
    return true;
  }
  return false;
}

updateProjectiles(step, collide);
updateProjectiles(step, collide);

assert.strictEqual(getActiveProjectiles().length, 0, 'Projectile removed after collision');
assert.strictEqual(target.hp, 2, 'Target took damage');

const reused = spawnProjectile({ x: 0, y: 0, dx: 1, dy: 0, r: 0.5, damage: 1 });
assert.strictEqual(reused, first, 'Reused pooled projectile');

resetProjectiles();
assert.strictEqual(getActiveProjectiles().length, 0, 'Manager reset clears active projectiles');

console.log('projectileManager tests passed');
