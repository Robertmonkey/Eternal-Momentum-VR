import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';

// SyphonAI - Implements boss B23: The Syphon
// Attempts to steal the player's offensive power with a telegraphed cone attack.

export class SyphonAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.ConeGeometry(0.3 * radius, 0.6 * radius, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x9b59b6 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 450, model: mesh });

    this.radius = radius;
    this.isCharging = false;
    this.lastSyphon = 0;
  }

  update(delta, playerObj, state, gameHelpers) {
    if (!this.alive || !playerObj) return;

    if (!this.isCharging && Date.now() - this.lastSyphon > 7500) {
      this.isCharging = true;
      this.lastSyphon = Date.now();
      gameHelpers?.play?.('chargeUpSound');
      setTimeout(() => {
        if (!this.alive) return;
        this.isCharging = false;
        if (this.position.distanceTo(playerObj.position) < this.radius * 1.5) {
          gameHelpers?.disableOffensivePower?.();
        }
      }, 2000);
    }
  }
}
