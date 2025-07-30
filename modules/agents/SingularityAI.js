import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';

// SingularityAI - Implements boss B20: The Singularity
// Simplified multi-phase boss combining gravity wells, glitch zones,
// and teleportation behaviour.

export class SingularityAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.IcosahedronGeometry(0.4 * radius, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 600, model: mesh });

    this.radius = radius;
    this.phase = 1;
    this.lastAction = 0;
    this.wells = [];
    this.teleportTimer = 0;
  }

  spawnWell() {
    const t = Math.random() * 2 * Math.PI;
    const p = Math.random() * Math.PI;
    const pos = new THREE.Vector3(
      Math.sin(p) * Math.cos(t) * this.radius,
      Math.cos(p) * this.radius,
      Math.sin(p) * Math.sin(t) * this.radius
    );
    this.wells.push({ pos, end: Date.now() + 4000 });
  }

  update(delta, playerObj, state, gameHelpers) {
    if (!this.alive) return;

    const hpPct = this.health / this.maxHealth;
    if (hpPct <= 0.33 && this.phase < 3) {
      this.phase = 3;
      this.wells = [];
      this.teleportTimer = 0;
      gameHelpers?.play?.('finalBossPhaseSound');
    } else if (hpPct <= 0.66 && this.phase < 2) {
      this.phase = 2;
      this.wells = [];
      gameHelpers?.play?.('finalBossPhaseSound');
    }

    if (this.phase === 1) {
      if (Date.now() - this.lastAction > 5000) {
        this.spawnWell();
        this.lastAction = Date.now();
      }
    } else if (this.phase === 2) {
      if (Date.now() - this.lastAction > 7000) {
        this.spawnWell();
        this.spawnWell();
        this.lastAction = Date.now();
      }
    } else {
      this.teleportTimer += delta;
      if (this.teleportTimer > 4) {
        const t = Math.random() * 2 * Math.PI;
        const p = Math.random() * Math.PI;
        this.position.set(
          Math.sin(p) * Math.cos(t) * this.radius,
          Math.cos(p) * this.radius,
          Math.sin(p) * Math.sin(t) * this.radius
        );
        this.teleportTimer = 0;
        gameHelpers?.play?.('teleportSound');
      }
    }

    this.wells = this.wells.filter(w => Date.now() < w.end);
    this.wells.forEach(w => {
      if (playerObj) {
        const dir = w.pos.clone().sub(playerObj.position);
        if (dir.length() < 0.5 * this.radius) {
          playerObj.position.add(dir.normalize().multiplyScalar(-0.002 * delta));
        }
      }
    });
  }
}
