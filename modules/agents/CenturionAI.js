import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import * as CoreManager from '../CoreManager.js';

// CenturionAI - Implements boss B24: The Centurion
// Summons a shrinking energy box around the player.

export class CenturionAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.BoxGeometry(0.6 * radius, 0.6 * radius, 0.6 * radius);
    const mat = new THREE.MeshBasicMaterial({ color: 0xd35400 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 480, model: mesh });

    this.radius = radius;
    this.lastWall = 0;
    this.activeBoxes = [];
  }

  update(delta, playerObj, state, gameHelpers) {
    if (!this.alive || !playerObj) return;

    if (Date.now() - this.lastWall > 12000) {
      this.lastWall = Date.now();
      const box = { start: Date.now(), duration: 6000, size: 2 * this.radius };
      this.activeBoxes.push(box);
      gameHelpers?.play?.('wallSummon');
    }

    this.activeBoxes = this.activeBoxes.filter(b => Date.now() - b.start < b.duration);
    this.activeBoxes.forEach(b => {
      const progress = (Date.now() - b.start) / b.duration;
      const size = b.size * (1 - progress);
      if (Math.abs(playerObj.position.x - this.position.x) > size / 2 ||
          Math.abs(playerObj.position.z - this.position.z) > size / 2) {
        return;
      }
      if (typeof playerObj.health === 'number') {
        const dmg = 0.3 * delta;
        playerObj.health -= dmg;
        CoreManager.onPlayerDamage(dmg, this, gameHelpers);
      }
    });
  }
}
