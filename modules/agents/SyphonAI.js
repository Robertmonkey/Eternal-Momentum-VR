import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

export class SyphonAI extends BaseAgent {
  constructor() {
    const bossData = { id: "syphon", name: "The Syphon", maxHP: 450 };
    super({ health: bossData.maxHP, color: 0x9b59b6, kind: bossData.id });

    this.name = bossData.name;
    this.isCharging = false;
    this.lastSyphonTime = 0;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    if (!this.isCharging && now - this.lastSyphonTime > 7500) {
      this.isCharging = true;
      gameHelpers.play('chargeUpSound');

      const effect = {
        type: 'syphon_cone',
        source: this,
        direction: state.player.position.clone().sub(this.position).normalize(),
        startTime: now,
        endTime: now + 2500,
      };

      // Create a warning cone effect that can track the player
      state.effects.push(effect);

      setTimeout(() => {
        if (!this.alive) return;

        const playerDirection = state.player.position.clone().sub(this.position).normalize();
        const angle = playerDirection.angleTo(effect.direction);

        if (angle < Math.PI / 8) {
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
