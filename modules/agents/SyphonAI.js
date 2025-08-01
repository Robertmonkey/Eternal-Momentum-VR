import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

export class SyphonAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.ConeGeometry(0.6, 1.2, 16);
    const material = new THREE.MeshStandardMaterial({
        color: 0x9b59b6,
        emissive: 0x9b59b6,
        emissiveIntensity: 0.5
    });
    super({ model: new THREE.Mesh(geometry, material) });

    const bossData = { id: "syphon", name: "The Syphon", maxHP: 450 };
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;
    
    this.isCharging = false;
    this.lastSyphonTime = 0;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    if (!this.isCharging && now - this.lastSyphonTime > 7500) {
      this.isCharging = true;
      gameHelpers.play('chargeUpSound');

      const targetDirection = state.player.position.clone().sub(this.position).normalize();

      // Create a warning cone effect
      state.effects.push({
        type: 'syphon_cone',
        source: this,
        direction: targetDirection,
        endTime: now + 2500,
      });

      setTimeout(() => {
        if (!this.alive) return;

        const playerDirection = state.player.position.clone().sub(this.position).normalize();
        const angle = playerDirection.angleTo(targetDirection);

        if (angle < Math.PI / 8) { // Check if player is within the cone's angle
          const stolenPower = state.offensiveInventory[0];
          if (stolenPower) {
            gameHelpers.play('powerAbsorb');
            state.offensiveInventory.shift();
            state.offensiveInventory.push(null);
            // In a fuller implementation, the boss would use the stolen power here
          }
        }
        
        this.isCharging = false;
        this.lastSyphonTime = now + 2500;
      }, 2500);
    }
  }
}
