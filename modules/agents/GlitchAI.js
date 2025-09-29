import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class GlitchAI extends BaseAgent {
  constructor() {
    // Create a group of small cubes that will swirl to form the glitch
    const material = new THREE.MeshStandardMaterial({
      color: 0xfd79a8,
      emissive: 0xfd79a8,
      wireframe: true
    });

    const cubeGroup = new THREE.Group();
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeCount = 6;
    const radius = 2;
    for (let i = 0; i < cubeCount; i++) {
      const cube = new THREE.Mesh(cubeGeometry, material);
      const angle = (i / cubeCount) * Math.PI * 2;
      cube.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      cubeGroup.add(cube);
    }

    super({ model: cubeGroup });
    this.cubeGroup = cubeGroup;

    const bossData = { id: "glitch", name: "The Glitch", maxHP: 336 };
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;
    this.maxHealth = this.maxHP;
    this.bossId = bossData.id;

    this.lastTeleportTime = 0;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    // Animate the swirling cubes for a constant glitchy motion
    const rot = delta * 0.001;
    this.cubeGroup.rotation.x += rot * 1.2;
    this.cubeGroup.rotation.y += rot * 1.5;
    this.cubeGroup.rotation.z += rot;

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
