import * as THREE from '../vendor/three.module.js';

const pool = [];
const active = [];

export function spawnProjectile(props = {}) {
  const p = pool.pop() || {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    r: 0,
    damage: 0,
    alive: true,
  };

  if (props.position instanceof THREE.Vector3) {
    p.position.copy(props.position);
  } else {
    p.position.set(props.x || 0, props.y || 0, props.z || 0);
  }

  if (props.velocity instanceof THREE.Vector3) {
    p.velocity.copy(props.velocity);
  } else {
    p.velocity.set(props.dx || 0, props.dy || 0, props.dz || 0);
  }

  p.r = props.r ?? 0;
  p.damage = props.damage ?? 0;
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
    const p = active.pop();
    p.alive = false;
    if (p.velocity && p.velocity.isVector3) p.velocity.set(0, 0, 0);
    pool.push(p);
  }
}

export function getActiveProjectiles() {
  return active;
}
