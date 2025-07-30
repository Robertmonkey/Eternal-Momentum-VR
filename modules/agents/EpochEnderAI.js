import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';

// EpochEnderAI - Implements boss B28: The Epoch-Ender
// Can rewind its health and position after taking significant damage.

export class EpochEnderAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.SphereGeometry(0.4 * radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xbdc3c7 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 550, model: mesh });

    this.radius = radius;
    this.damageWindow = 0;
    this.lastState = { pos: this.position.clone(), hp: this.health };
    this.rewindCooldown = 0;
  }

  update(delta, playerObj, state, gameHelpers) {
    if (!this.alive) return;
    const now = Date.now();

    if (!this.rewindCooldown) {
      this.damageWindow += delta * 10; // accumulate pseudo damage
      if (this.damageWindow > 100) {
        gameHelpers?.play?.('timeRewind');
        this.position.copy(this.lastState.pos);
        this.health = this.lastState.hp;
        this.rewindCooldown = now + 15000;
        this.damageWindow = 0;
      }
    } else if (now > this.rewindCooldown) {
      this.rewindCooldown = 0;
    }

    if (!this.lastUpdate || now - this.lastUpdate > 2000) {
      this.lastUpdate = now;
      this.lastState = { pos: this.position.clone(), hp: this.health };
    }
  }
}
