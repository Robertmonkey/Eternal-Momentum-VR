import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

export class ParasiteAI extends BaseAgent {
  constructor() {
    // A more organic shape for the Parasite
    const geometry = new THREE.SphereGeometry(0.7, 16, 8);
    geometry.morphAttributes.position = [];
    const positions = geometry.attributes.position;
    const spherePositions = [];
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        spherePositions.push(
            x * Math.sqrt(1 - (y * y / 2) - (z * z / 2) + (y * y * z * z / 3)),
            y * Math.sqrt(1 - (z * z / 2) - (x * x / 2) + (z * z * x * x / 3)),
            z * Math.sqrt(1 - (x * x / 2) - (y * y / 2) + (x * x * y * y / 3))
        );
    }
    geometry.setAttribute('morphTarget0', new THREE.Float32BufferAttribute(spherePositions, 3));

    const material = new THREE.MeshStandardMaterial({
        color: 0x55efc4,
        emissive: 0x55efc4,
        emissiveIntensity: 0.4,
        morphTargets: true
    });
    super({ model: new THREE.Mesh(geometry, material) });

    const bossData = { id: "parasite", name: "The Parasite", maxHP: 416 };
    Object.assign(this, bossData);
  }

  infect(target) {
    if (target.isInfected) return;
    target.isInfected = true;
    
    // For the player, add a status effect. For enemies, just set the flag.
    if (target === state.player) {
      gameHelpers.addStatusEffect('Infected', '☣️', 10000);
      target.infectionEnd = Date.now() + 10000;
    } else {
      // Visual change for infected enemies
      if (target.model && target.model.material) {
        target.model.material.color.set(0x55efc4);
      }
    }
  }

  update(delta) {
    if (!this.alive) return;
    
    // Animate the morph target for a pulsating effect
    this.model.morphTargetInfluences[0] = (Math.sin(Date.now() * 0.005) + 1) / 2;

    // Infect player on contact
    if (this.position.distanceTo(state.player.position) < this.r + state.player.r) {
      this.infect(state.player);
    }

    // Infect other enemies on contact
    state.enemies.forEach(e => {
      if (e !== this && !e.boss && !e.isFriendly) {
        if (this.position.distanceTo(e.position) < this.r + e.r) {
          this.infect(e);
        }
      }
    });
  }

  die() {
      // On death, cure the player's infection
      const playerInfection = state.player.statusEffects.find(e => e.name === 'Infected');
      if (playerInfection) {
          playerInfection.endTime = Date.now();
      }
      super.die();
  }
}
