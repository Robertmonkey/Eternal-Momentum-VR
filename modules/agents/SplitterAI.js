import { BaseAgent } from '../BaseAgent.js';
import { spherePosToUv } from '../utils.js';
import { spawnEnemy } from '../gameLoop.js';

export class SplitterAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.SphereGeometry(0.3 * radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, emissive: 0xff0000 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 96, model: mesh });
    this.radius = radius;
    this.lastShot = Date.now();
  }

  update(delta, playerObj, state) {
    if (!this.alive) return;

    // Fire a slow projectile at the player every 5 seconds
    if (playerObj && Date.now() - this.lastShot > 5000) {
      this.lastShot = Date.now();
      const fromUv = spherePosToUv(this.position.clone().normalize(), this.radius);
      const toUv = spherePosToUv(playerObj.position.clone().normalize(), this.radius);
      const dx = (toUv.u - fromUv.u) * 2048 * 0.2;
      const dy = (toUv.v - fromUv.v) * 1024 * 0.2;
      state?.effects?.push({
        type: 'nova_bullet',
        caster: this,
        x: fromUv.u * 2048,
        y: fromUv.v * 1024,
        r: 5,
        dx,
        dy,
        color: '#ff0000',
        damage: 10
      });
    }
  }

  die() {
    super.die();
    if (typeof this.onDeath === 'function') this.onDeath();
    // Spawn two waves of minions
    const centerUv = spherePosToUv(this.position.clone().normalize(), this.radius);
    const center = { x: centerUv.u * 2048, y: centerUv.v * 1024 };
    const spawnWave = radiusPx => {
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * 2 * Math.PI + Math.random() * 0.5;
        const x = center.x + Math.cos(ang) * radiusPx;
        const y = center.y + Math.sin(ang) * radiusPx;
        spawnEnemy(false, null, { x, y });
      }
    };
    spawnWave(60);
    setTimeout(() => spawnWave(120), 1000);
  }
}
