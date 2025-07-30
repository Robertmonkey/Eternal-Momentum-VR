import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { spherePosToUv } from '../utils.js';

// VampireAI - Boss B03: Vampire Veil
// Reimplementation of the original 2D behaviour. This boss slowly regenerates
// health when left unharmed and sometimes drops healing pickups when damaged.
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

  update(delta, playerObj, gameState, gameHelpers) {
    if (!this.alive) return;
    const now = Date.now();
    if (now - this.lastHit > 3000 && now - this.lastHeal > 5000) {
      this.health = Math.min(this.maxHealth, this.health + 5);
      this.lastHeal = now;
      if (gameHelpers?.play) gameHelpers.play('vampireHeal');
      if (gameHelpers?.spawnParticles) {
        const uv = spherePosToUv(this.position.clone().normalize(), this.radius);
        gameHelpers.spawnParticles(
          uv.u * 2048,
          uv.v * 1024,
          '#800020',
          20,
          1,
          40
        );
      }
    }
  }

  takeDamage(amount, sourceObj, gameState, gameHelpers) {
    this.lastHit = Date.now();
    if (Math.random() < 0.3 && gameState) {
      gameState.pickups.push({
        position: this.position.clone(),
        r: 10,
        type: 'heal',
        emoji: '🩸',
        lifeEnd: Date.now() + 8000,
        vx: 0,
        vy: 0,
        customApply: () => {
          if (sourceObj && typeof sourceObj.health === 'number') {
            sourceObj.health = Math.min(sourceObj.maxHealth || Infinity, sourceObj.health + 10);
            if (gameHelpers?.spawnParticles) {
              const uv = spherePosToUv(sourceObj.position.clone().normalize(), this.radius);
              gameHelpers.spawnParticles(uv.u * 2048, uv.v * 1024, '#800020', 20, 3, 30);
            }
          }
        }
      });
    }
    super.takeDamage(amount);
  }
}
