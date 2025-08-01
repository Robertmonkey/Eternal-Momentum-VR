import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';

export class VampireAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.ConeGeometry(0.8, 1.6, 16);
    const material = new THREE.MeshStandardMaterial({
        color: 0x800020,
        emissive: 0x800020,
        emissiveIntensity: 0.4
    });
    super({ model: new THREE.Mesh(geometry, material) });

    const bossData = { id: "vampire", name: "Vampire Veil", maxHP: 144 };
    Object.assign(this, bossData);
    
    this.lastHitTime = Date.now();
    this.lastHealTime = Date.now();
  }

  update(delta, playerObj, state, gameHelpers) {
    if (!this.alive) return;
    const now = Date.now();

    // Regenerate health if not damaged recently
    if (now - this.lastHitTime > 3000 && now - this.lastHealTime > 5000) {
      this.health = Math.min(this.maxHP, this.health + 5);
      this.lastHealTime = now;
      gameHelpers.play('vampireHeal');
      // Visual effect for healing can be added here
    }
  }

  takeDamage(amount, sourceObject) {
    if (!this.alive) return;
    this.lastHitTime = Date.now();

    // Chance to spawn a healing orb on being hit
    if (Math.random() < 0.3) {
      state.pickups.push({
        position: this.position.clone(),
        r: 0.4,
        type: 'custom',
        emoji: '🩸',
        lifeEnd: Date.now() + 8000,
        isSeeking: true,
        seekTarget: this, // The orb seeks the boss itself
        customApply: (target) => {
          if (target === this) {
            this.health = Math.min(this.maxHP, this.health + 20);
          }
        }
      });
    }
    
    super.takeDamage(amount, sourceObject);
  }
}
