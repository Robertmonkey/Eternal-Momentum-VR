import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';

// FractalHorrorAI - Implements boss B25: The Fractal Horror
// Splits into smaller copies as its shared health decreases.

export class FractalHorrorAI extends BaseAgent {
  constructor(radius = 1, generation = 1, shared) {
    const geom = new THREE.DodecahedronGeometry(0.4 * radius);
    const mat = new THREE.MeshBasicMaterial({ color: 0xbe2edd });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 1000 / generation, model: mesh });

    this.radius = radius;
    this.generation = generation;
    this.shared = shared || { hp: 1000 };
  }

  update(delta, playerObj, state, gameHelpers) {
    if (!this.alive) return;
    if (this.shared.hp <= 0) { this.die(); return; }

    if (this.health < this.maxHealth * 0.5 && this.generation < 4) {
      this.shared.hp -= this.health;
      this.health = 0;
      for (let i = 0; i < 2; i++) {
        const child = new FractalHorrorAI(this.radius * 0.7, this.generation + 1, this.shared);
        child.position.copy(this.position);
        this.parent.add(child);
        state?.enemies?.push(child);
      }
      this.die();
    }
  }
}
