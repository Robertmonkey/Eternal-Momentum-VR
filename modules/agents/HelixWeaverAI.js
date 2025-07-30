import { BaseAgent } from '../BaseAgent.js';

// HelixWeaverAI - Implements boss B27: The Helix Weaver
// Stationary boss that fires spiraling projectiles.

export class HelixWeaverAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.TorusGeometry(0.4 * radius, 0.1 * radius, 8, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xe74c3c });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 500, model: mesh });

    this.radius = radius;
    this.angle = 0;
    this.lastShot = 0;
    this.activeArms = 1;
  }

  update(delta, playerObj, state, gameHelpers) {
    if (!this.alive) return;

    if (Date.now() - this.lastShot > 100) {
      this.lastShot = Date.now();
      const totalArms = 4;
      for (let i = 0; i < this.activeArms; i++) {
        const ang = this.angle + (i * (2 * Math.PI / totalArms));
        state?.effects?.push({ type: 'nova_bullet', caster: this, x: this.position.x, y: this.position.y, z: this.position.z, angle: ang });
      }
      this.angle += 0.2;
    }

    const hpPct = this.health / this.maxHealth;
    if (hpPct < 0.8) this.activeArms = 2;
    if (hpPct < 0.6) this.activeArms = 3;
    if (hpPct < 0.4) this.activeArms = 4;
  }
}
