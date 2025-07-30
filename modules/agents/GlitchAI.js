import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { moveTowards } from '../movement3d.js';

// GlitchAI - Implements boss B13: The Glitch
// Frequently teleports leaving behind zones that invert controls.

export class GlitchAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.OctahedronGeometry(0.3 * radius, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfd79a8 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 336, model: mesh });
    this.radius = radius;
    this.timer = 0;
    this.moveTarget = this.randomPos();
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

  update(delta, gameHelpers) {
    if (!this.alive) return;
    this.timer += delta;
    moveTowards(this.position, this.moveTarget, 0.6, this.radius);
    if (this.position.distanceTo(this.moveTarget) < 0.05 * this.radius) {
      this.moveTarget = this.randomPos();
    }
    if (this.timer >= 3) {
      this.timer = 0;
      if (gameHelpers && typeof gameHelpers.play === 'function') {
        gameHelpers.play('glitchSound');
      }
      if (gameHelpers && typeof gameHelpers.addGlitchZone === 'function') {
        gameHelpers.addGlitchZone(this.position.clone());
      }
      this.position.copy(this.randomPos());
    }
  }
}
