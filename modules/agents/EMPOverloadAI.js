import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

export class EMPOverloadAI extends BaseAgent {
  constructor() {
    const bossData = { id: "emp", name: "EMP Overload", maxHP: 260 };
    super({ health: bossData.maxHP, color: 0x3498db, kind: bossData.id });

    this.name = bossData.name;
    this.lastEMPTime = 0;
    this.isCharging = false;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    if (!this.isCharging && now - this.lastEMPTime > 8000) {
      this.isCharging = true;
      gameHelpers.play('chargeUpSound');

      // 3 second charge-up time before discharge
      setTimeout(() => {
        if (!this.alive) return;
        
        gameHelpers.play('empDischarge');
        
        // Wipe player inventories
        state.offensiveInventory = [null, null, null];
        state.defensiveInventory = [null, null, null];
        
        // Apply status effects
        gameHelpers.addStatusEffect('Slowed', '🐌', 1000);
        gameHelpers.addStatusEffect('Stunned', '😵', 500);

        // Visual effect for the blast
        state.effects.push({
            type: 'shockwave',
            caster: this,
            position: this.position.clone(),
            maxRadius: 100, // Arena radius * 2
            speed: 200,
            damage: 0, // EMP doesn't do direct damage
            color: new THREE.Color(0x3498db)
        });
        
        this.isCharging = false;
        this.lastEMPTime = now + 3000; // Record time after discharge
      }, 3000);
    }
  }
}
