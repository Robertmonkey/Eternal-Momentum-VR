import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class SingularityAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.IcosahedronGeometry(1.0, 2);
    const material = new THREE.MeshStandardMaterial({
        color: 0x000000,
        metalness: 0.9,
        roughness: 0.1
    });
    super({ model: new THREE.Mesh(geometry, material) });

    const bossData = { id: "singularity", name: "The Singularity", maxHP: 600 };
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;
    
    this.phase = 1;
    this.lastActionTime = 0;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();
    const hpPercent = this.health / this.maxHP;

    // Phase transition logic
    if (hpPercent <= 0.33 && this.phase < 3) {
      this.phase = 3;
      gameHelpers.play('finalBossPhaseSound');
    } else if (hpPercent <= 0.66 && this.phase < 2) {
      this.phase = 2;
      gameHelpers.play('finalBossPhaseSound');
    }
    
    // Phase-specific actions
    switch (this.phase) {
      case 1: // Gravity Wells
        if (now - this.lastActionTime > 5000) {
          this.lastActionTime = now;
          for (let i = 0; i < 4; i++) {
              state.effects.push({
                  type: 'gravity_well',
                  position: new THREE.Vector3().randomDirection().multiplyScalar(ARENA_RADIUS),
                  radius: 5,
                  endTime: now + 4000
              });
          }
        }
        break;
      case 2: // Glitch Zones
        if (now - this.lastActionTime > 4000) {
            this.lastActionTime = now;
            state.effects.push({
                type: 'glitch_zone',
                position: new THREE.Vector3().randomDirection().multiplyScalar(ARENA_RADIUS),
                radius: 8,
                endTime: now + 3000
            });
        }
        break;
      case 3: // Teleport and Minion Spawn
        if (now - this.lastActionTime > 2000) {
            this.lastActionTime = now;
            this.position.copy(new THREE.Vector3().randomDirection().multiplyScalar(ARENA_RADIUS));
            for (let i = 0; i < 3; i++) {
                const minion = gameHelpers.spawnEnemy(false);
                if (minion) {
                    minion.position.copy(this.position);
                    minion.r = 0.4;
                    minion.hp = 10;
                }
            }
        }
        break;
    }
  }
}
