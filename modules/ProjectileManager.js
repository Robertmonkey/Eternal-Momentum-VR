const pool = [];
const active = [];

export function spawnProjectile(props = {}) {
  const p = pool.pop() || {};
  Object.assign(p, props);
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
