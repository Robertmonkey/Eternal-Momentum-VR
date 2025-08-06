import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class TimeEaterAI extends BaseAgent {
  constructor() {
    const bossData = { id: "time_eater", name: "Time Eater", maxHP: 440 };
    super({ health: bossData.maxHP, color: 0xdfe6e9, kind: bossData.id });

    this.name = bossData.name;
    this.lastAbilityTime = 0;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    if (now - this.lastAbilityTime > 5000) {
      this.lastAbilityTime = now;
      gameHelpers.play('dilationField');
      
      for (let i = 0; i < 4; i++) {
        const zonePos = new THREE.Vector3().randomDirection().multiplyScalar(ARENA_RADIUS);
        const driftVel = new THREE.Vector3().randomDirection().multiplyScalar(0.1);

        state.effects.push({
          type: 'slow_zone',
          position: zonePos,
          velocity: driftVel,
          radius: 8, // World units
          endTime: now + 6000,
        });
      }
    }
  }
}
