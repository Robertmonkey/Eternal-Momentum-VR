import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';
import { applyPlayerHeal } from '../helpers.js';

export class VampireAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.ConeGeometry(0.8, 1.6, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0x800020, emissive: 0x800020 });
    super({ health: 144, model: new THREE.Mesh(geometry, material) });
    
    this.name = "Vampire Veil";
    this.kind = "vampire";
    this.lastHitTime = Date.now();
    this.lastHealTime = Date.now();
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    if (now - this.lastHitTime > 3000 && now - this.lastHealTime > 5000) {
      this.health = Math.min(this.maxHP, this.health + 5);
      this.lastHealTime = now;
      gameHelpers.play('vampireHeal');
    }
  }

  takeDamage(amount, sourceObject = state.player) {
    if (!this.alive) return;
    this.lastHitTime = Date.now();

    if (Math.random() < 0.3) {
      state.pickups.push({
        position: this.position.clone(),
        r: 0.4,
        type: 'custom',
        emoji: '🩸',
        lifeEnd: Date.now() + 8000,
        isSeeking: true,
        seekTarget: state.player,
        customApply: () => {
          applyPlayerHeal(20);
        },
      });
    }
    
    super.takeDamage(amount, true);
  }
}
