import { BaseAgent } from '../BaseAgent.js';
import { spawnProjectile } from '../ProjectileManager.js';
import { spherePosToUv } from '../utils.js';

export class VampireAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.ConeGeometry(0.4 * radius, 0.8 * radius, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xdc143c });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 60, model: mesh });

    this.radius = radius;
    this.state = 'ATTACKING';
    this.timer = 0;
    this.syphonRadius = 0.6 * radius;

    const auraGeom = new THREE.SphereGeometry(this.syphonRadius, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xdc143c,
      transparent: true,
      opacity: 0.2,
    });
    this.aura = new THREE.Mesh(auraGeom, auraMat);
    this.aura.visible = false;
    this.add(this.aura);
  }

  update(delta, playerPos2d, width, height) {
    if (!this.alive) return;
    this.timer += delta;

    const uv = spherePosToUv(this.position.clone().normalize(), this.radius);
    const px = uv.u * width;
    const py = uv.v * height;

    if (this.state === 'ATTACKING') {
      if (this.timer >= 2) {
        this.timer = 0;
        for (let i = 0; i < 3; i++) {
          const dx = playerPos2d.x - px;
          const dy = playerPos2d.y - py;
          const len = Math.hypot(dx, dy) || 1;
          spawnProjectile({
            x: px,
            y: py,
            dx: (dx / len) * 0.6,
            dy: (dy / len) * 0.6,
            r: 8,
            damage: 5,
          });
        }
        this.state = 'SYPHONING';
        this.aura.visible = true;
        if (typeof this.onSyphonStart === 'function') this.onSyphonStart();
      }
    } else if (this.state === 'SYPHONING') {
      const dist = Math.hypot(playerPos2d.x - px, playerPos2d.y - py);
      const radiusPx = (this.syphonRadius / this.radius) * width;
      if (dist < radiusPx) {
        this.health = Math.min(this.maxHealth, this.health + delta * 10);
      }
      if (this.timer >= 3) {
        this.timer = 0;
        this.state = 'ATTACKING';
        this.aura.visible = false;
      }
    }
  }
}
