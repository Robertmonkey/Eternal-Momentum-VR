import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class ArchitectAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const material = new THREE.MeshStandardMaterial({
        color: 0x7f8c8d,
        emissive: 0x7f8c8d,
        emissiveIntensity: 0.2
    });
    super({ model: new THREE.Mesh(geometry, material) });

    const bossData = { id: "architect", name: "The Architect", maxHP: 280 };
    Object.assign(this, bossData);
    
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
