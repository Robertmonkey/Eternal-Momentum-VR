import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class GlitchAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    // Use a wireframe material to give it a digital/glitchy look
    const material = new THREE.MeshStandardMaterial({
        color: 0xfd79a8,
        emissive: 0xfd79a8,
        wireframe: true
    });
    super({ model: new THREE.Mesh(geometry, material) });

    const bossData = { id: "glitch", name: "The Glitch", maxHP: 336 };
    Object.assign(this, bossData);
    
    this.lastTeleportTime = 0;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    if (now - this.lastTeleportTime > 3000) {
      this.lastTeleportTime = now;
      gameHelpers.play('glitchSound');

      const oldPosition = this.position.clone();
      
      // Teleport to new random position
      const newPosition = new THREE.Vector3().randomDirection().multiplyScalar(ARENA_RADIUS);
      this.position.copy(newPosition);
      
      // Leave a glitch zone behind
      state.effects.push({
        type: 'glitch_zone',
        position: oldPosition,
        radius: 6, // World units
        endTime: now + 5000,
      });
    }
  }
}
