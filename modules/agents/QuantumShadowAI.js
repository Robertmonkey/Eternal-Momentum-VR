import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';

// QuantumShadowAI - Implements boss B18: Quantum Shadow
// Periodically creates quantum echoes and becomes invulnerable while
// choosing a new location.

export class QuantumShadowAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.SphereGeometry(0.3 * radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x81ecec });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 360, model: mesh });

    this.radius = radius;
    this.state = 'seeking';
    this.lastPhaseChange = Date.now();
    this.invulnerable = false;
    this.echoes = [];
  }

  randomPos() {
    const t = Math.random() * 2 * Math.PI;
    const p = Math.random() * Math.PI;
    return new THREE.Vector3(
      Math.sin(p) * Math.cos(t) * this.radius,
      Math.cos(p) * this.radius,
      Math.sin(p) * Math.sin(t) * this.radius
    );
  }

  update(delta, playerObj, gameHelpers) {
    if (!this.alive) return;

    if (this.state === 'seeking' && Date.now() - this.lastPhaseChange > 7000) {
      this.state = 'superposition';
      this.lastPhaseChange = Date.now();
      this.invulnerable = true;
      gameHelpers?.play?.('phaseShiftSound');
      this.echoes = [this.randomPos(), this.randomPos(), this.randomPos()];
    } else if (this.state === 'superposition') {
      if (Date.now() - this.lastPhaseChange > 3000) {
        this.state = 'seeking';
        this.lastPhaseChange = Date.now();
        this.invulnerable = false;
        const target = this.echoes[Math.floor(Math.random() * this.echoes.length)];
        if (target) this.position.copy(target);
        this.echoes = [];
      }
    }
  }

  takeDamage(amount, gameHelpers) {
    if (this.invulnerable) return;
    super.takeDamage(amount, true, gameHelpers);
  }
}
