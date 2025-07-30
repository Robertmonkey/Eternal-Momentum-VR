import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';

// ArchitectAI - Implements boss B8: The Architect
// This boss periodically erects rotating wall barriers then
// reconfigures the arena by removing them before the cycle repeats.

export class ArchitectAI extends BaseAgent {
  constructor(radius = 1) {
    const group = new THREE.Group();
    const boxGeom = new THREE.BoxGeometry(0.4 * radius, 0.4 * radius, 0.4 * radius);
    const boxMat = new THREE.MeshBasicMaterial({ color: 0x808080 });
    for (let i = 0; i < 5; i++) {
      const cube = new THREE.Mesh(boxGeom.clone(), boxMat.clone());
      cube.position.set(
        (Math.random() - 0.5) * 0.2 * radius,
        (Math.random() - 0.5) * 0.2 * radius,
        (Math.random() - 0.5) * 0.2 * radius
      );
      group.add(cube);
    }
    super({ health: 300, model: group });

    this.radius = radius;
    this.state = 'SUMMONING';
    this.timer = 0;
    this.walls = [];
  }

  randomPos() {
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.random() * Math.PI;
    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * this.radius,
      Math.cos(phi) * this.radius,
      Math.sin(phi) * Math.sin(theta) * this.radius
    );
  }

  spawnWalls(gameHelpers) {
    this.walls.forEach(w => this.remove(w));
    this.walls = [];
    for (let i = 0; i < 3; i++) {
      const wallGeom = new THREE.CylinderGeometry(0.05 * this.radius, 0.05 * this.radius, this.radius, 8);
      const wallMat = new THREE.MeshBasicMaterial({ color: 0x808080 });
      const wall = new THREE.Mesh(wallGeom, wallMat);
      wall.position.copy(this.randomPos());
      wall.lookAt(new THREE.Vector3());
      this.add(wall);
      this.walls.push(wall);
    }
    if (gameHelpers && typeof gameHelpers.play === 'function') {
      gameHelpers.play('architectBuild');
      gameHelpers.play('wallSummon');
    }
  }

  clearWalls(gameHelpers) {
    this.walls.forEach(w => this.remove(w));
    this.walls = [];
    if (gameHelpers && typeof gameHelpers.play === 'function') {
      gameHelpers.play('wallShrink');
    }
  }

  update(delta, gameHelpers) {
    if (!this.alive) return;

    this.timer += delta;
    if (this.state === 'SUMMONING' && this.timer >= 4) {
      this.timer = 0;
      this.spawnWalls(gameHelpers);
      this.state = 'ATTACKING';
    } else if (this.state === 'ATTACKING' && this.timer >= 8) {
      this.timer = 0;
      this.clearWalls(gameHelpers);
      this.state = 'SUMMONING';
    }

    this.walls.forEach(w => {
      w.rotation.y += delta;
    });
  }
}
