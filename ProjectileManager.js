import * as THREE from '../vendor/three.module.js';

const pool = [];
const active = [];

export function spawnProjectile(props = {}) {
  const p = pool.pop() || {};
  p.position = (props.position instanceof THREE.Vector3)
    ? props.position.clone()
    : new THREE.Vector3(props.x || 0, props.y || 0, props.z || 0);
  p.velocity = (props.velocity instanceof THREE.Vector3)
    ? props.velocity.clone()
    : new THREE.Vector3(props.dx || 0, props.dy || 0, props.dz || 0);
  p.r = props.r ?? p.r ?? 0;
  p.damage = props.damage ?? p.damage ?? 0;
  p.alive = true;
  active.push(p);
  return p;
}

export function updateProjectiles(stepFn, collisionFn) {
  for (let i = active.length - 1; i >= 0; i--) {
    const p = active[i];
    if (stepFn) stepFn(p);
    if (collisionFn && collisionFn(p)) {
      p.alive = false;
    }
    if (!p.alive) {
      active.splice(i, 1);
      pool.push(p);
    }
  }
}

export function resetProjectiles() {
  while (active.length) {
    pool.push(active.pop());
  }
}

export function getActiveProjectiles() {
  return active;
}
