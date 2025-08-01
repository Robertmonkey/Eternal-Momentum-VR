import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

// Import all AI types the Pantheon can channel
import { JuggernautAI } from './JuggernautAI.js';
import { AnnihilatorAI } from './AnnihilatorAI.js';
// ... and so on for all other bosses

export class PantheonAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.IcosahedronGeometry(1.2, 1);
    const material = new THREE.MeshStandardMaterial({
        color: 0xecf0f1,
        emissive: 0xffffff,
        emissiveIntensity: 0.2,
        metalness: 1.0,
        roughness: 0.1
    });
    super({ model: new THREE.Mesh(geometry, material) });

    const bossData = { id: "pantheon", name: "The Pantheon", maxHP: 3000 };
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;
    
    this.nextActionTime = Date.now() + 3000;
    this.activeAspects = new Map(); // Use a Map to store aspect AI instances

    // Simplified for this example; a full implementation would map all relevant AIs
    this.aspectPool = {
        primary: [{ id: 'juggernaut', AI: JuggernautAI }],
        ambient: [{ id: 'glitch', AI: GlitchAI }],
        projectile: [{ id: 'helix_weaver', AI: HelixWeaverAI }],
    };
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    // Summon a new aspect if it's time
    if (now > this.nextActionTime && this.activeAspects.size < 3) {
      this.nextActionTime = now + 8000;
      
      const availablePools = Object.keys(this.aspectPool).filter(p => ![...this.activeAspects.values()].some(a => a.type === p));
      if (availablePools.length > 0) {
        const poolName = availablePools[Math.floor(Math.random() * availablePools.length)];
        const aspectInfo = this.aspectPool[poolName][0];
        
        if (!this.activeAspects.has(aspectInfo.id)) {
            const aspectAI = new aspectInfo.AI();
            aspectAI.health = Infinity; // Aspect minions are invulnerable
            this.add(aspectAI.model); // Add the model to the Pantheon group
            
            this.activeAspects.set(aspectInfo.id, {
                ai: aspectAI,
                type: poolName,
                endTime: now + 15000
            });
            gameHelpers.play('pantheonSummon');
        }
      }
    }

    // Update and expire active aspects
    for (const [id, aspect] of this.activeAspects.entries()) {
        if (now > aspect.endTime) {
            this.remove(aspect.ai.model);
            this.activeAspects.delete(id);
        } else {
            // Position the aspect minion relative to the Pantheon
            aspect.ai.position.copy(this.position).add(new THREE.Vector3(this.activeAspects.size * 2 - 2, 0, 0));
            aspect.ai.update(delta);
        }
    }
  }

  die() {
      // Clean up all aspect minions on death
      for (const aspect of this.activeAspects.values()) {
          this.remove(aspect.ai.model);
      }
      this.activeAspects.clear();
      super.die();
  }
}
