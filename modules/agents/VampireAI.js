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
    this.state = 'ATTACKING';
    this.stateTimer = 0;
  }

  update(delta, playerObj, state, gameHelpers) {
    if (!this.alive) return;
    this.stateTimer += delta;

    if (this.state === 'ATTACKING') {
      if (this.stateTimer >= 2) {
        this.stateTimer = 0;
        // fire 3 projectiles in a burst
        const fromUv = spherePosToUv(this.position.clone().normalize(), this.radius);
        const targetUv = playerObj ? spherePosToUv(playerObj.position.clone().normalize(), this.radius) : fromUv;
        for (let i = 0; i < 3; i++) {
          const ang = (i - 1) * 0.1;
          const dx = (targetUv.u - fromUv.u) * 2048 * 0.25 + Math.cos(ang) * 2;
          const dy = (targetUv.v - fromUv.v) * 1024 * 0.25 + Math.sin(ang) * 2;
          state?.effects?.push({ type: 'nova_bullet', caster: this, x: fromUv.u * 2048, y: fromUv.v * 1024, r: 4, dx, dy, color: '#dc143c', damage: 8 });
        }
        this.state = 'SYPHONING';
        this.stateTimer = 0;
        gameHelpers?.play?.('vampireHeal');
      }
    } else if (this.state === 'SYPHONING') {
      if (playerObj && this.position.distanceTo(playerObj.position) < this.radius * 1.5) {
        this.health = Math.min(this.maxHealth, this.health + delta * 10);
      }
      if (this.stateTimer >= 3) {
        this.state = 'ATTACKING';
        this.stateTimer = 0;
      }
    }
  }

  takeDamage(amount) {
    this.lastHit = Date.now();
    super.takeDamage(amount);
  }
}
