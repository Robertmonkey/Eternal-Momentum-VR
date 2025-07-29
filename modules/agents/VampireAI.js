import { BaseAgent } from '../BaseAgent.js';
import { spherePosToUv } from '../utils.js';

export class VampireAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.ConeGeometry(0.4 * radius, 0.8 * radius, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xdc143c });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 144, model: mesh });

    this.radius = radius;
    this.lastHit = Date.now();
    this.lastHeal = Date.now();
  }

  update() {
    if (!this.alive) return;
    const now = Date.now();
    if (now - this.lastHit > 3000 && now - this.lastHeal > 5000) {
      this.health = Math.min(this.maxHealth, this.health + 5);
      this.lastHeal = now;
      if (typeof this.onHeal === 'function') this.onHeal();
    }
  }

  takeDamage(amount) {
    this.lastHit = Date.now();
    super.takeDamage(amount);
  }
}
