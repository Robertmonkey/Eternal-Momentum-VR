import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';

// ParasiteAI - Implements boss B17: The Parasite
// Spreads infection on contact. Infected enemies periodically spawn hostile
// spores when they die.

export class ParasiteAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.SphereGeometry(0.35 * radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x55efc4 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 416, model: mesh });

    this.radius = radius;
  }

  infect(target, gameHelpers) {
    if (target.infected) return;
    target.infected = true;
    target.infectionEnd = Date.now() + 10000;
    target.lastSpore = Date.now();
    gameHelpers?.addStatusEffect?.('Infected', '☣️', 10000);
  }

  update(delta, playerObj, state, gameHelpers) {
    if (!this.alive) return;

    if (playerObj && this.position.distanceTo(playerObj.position) < this.radius * 0.6) {
      this.infect(playerObj, gameHelpers);
    }

    state?.enemies?.forEach(e => {
      if (e !== this && !e.boss && this.position.distanceTo(e.position) < this.radius * 0.6) {
        this.infect(e, gameHelpers);
      }
    });
  }
}
