import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';

// TimeEaterAI - Implements boss B19: Time Eater
// Periodically creates drifting slow zones that dramatically
// reduce projectile speed when entered.

export class TimeEaterAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.DodecahedronGeometry(0.4 * radius, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xdfe6e9 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 440, model: mesh });

    this.radius = radius;
    this.lastAbility = Date.now();
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

  spawnSlowZones(gameHelpers) {
    this.lastAbility = Date.now();
    for (let i = 0; i < 4; i++) {
      const pos = this.randomPos();
      if (gameHelpers && typeof gameHelpers.addSlowZone === 'function') {
        gameHelpers.addSlowZone(pos.clone(), 0.3 * this.radius, 6);
      }
    }
    if (gameHelpers && typeof gameHelpers.play === 'function') {
      gameHelpers.play('dilationField');
    }
  }

  update(delta, gameHelpers) {
    if (!this.alive) return;
    if (Date.now() - this.lastAbility > 5000) {
      this.spawnSlowZones(gameHelpers);
    }
  }
}
