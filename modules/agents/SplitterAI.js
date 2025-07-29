import { BaseAgent } from '../BaseAgent.js';
import { spawnProjectile } from '../ProjectileManager.js';
import { spherePosToUv } from '../utils.js';

export class SplitterAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.SphereGeometry(0.3 * radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, emissive: 0xff0000 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 20, model: mesh });
    this.radius = radius;
    this.attackTimer = 0;
  }

  update(delta, playerPos2d, width, height) {
    if (!this.alive) return;
    this.attackTimer += delta;
    if (this.attackTimer >= 5) {
      this.attackTimer = 0;
      const uv = spherePosToUv(this.position.clone().normalize(), this.radius);
      const dx = playerPos2d.x - uv.u * width;
      const dy = playerPos2d.y - uv.v * height;
      const len = Math.hypot(dx, dy) || 1;
      spawnProjectile({
        x: uv.u * width,
        y: uv.v * height,
        dx: (dx / len) * 0.5,
        dy: (dy / len) * 0.5,
        r: 10,
        damage: 5
      });
    }
  }

  die() {
    super.die();
    if (typeof this.onDeath === 'function') this.onDeath();
  }
}
