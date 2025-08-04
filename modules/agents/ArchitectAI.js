import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class ArchitectAI extends BaseAgent {
  constructor() {
    super({ color: 0x7f8c8d });

    const bossData = { id: "architect", name: "The Architect", maxHP: 280 };
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;
    
    this.lastBuildTime = 0;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    if (now - this.lastBuildTime > 10000) {
      this.lastBuildTime = now;
      gameHelpers.play('architectBuild');

      // Clear old pillars by filtering the effects array
      state.effects = state.effects.filter(e => e.type !== 'architect_pillar');
      
      const numPillars = 10;
      for (let i = 0; i < numPillars; i++) {
        const pillarPos = new THREE.Vector3().randomDirection().multiplyScalar(ARENA_RADIUS);
        
        state.effects.push({
          type: 'architect_pillar',
          position: pillarPos,
          radius: 1, // World unit radius for collision
          endTime: now + 9000, // Pillars last for 9 seconds
        });
      }
    }
  }

  die() {
      // Clear any remaining pillars on death
      state.effects = state.effects.filter(e => e.type !== 'architect_pillar');
      super.die();
  }
}
