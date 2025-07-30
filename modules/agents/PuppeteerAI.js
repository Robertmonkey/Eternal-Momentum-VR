import { BaseAgent } from '../BaseAgent.js';
import { moveTowards } from '../movement3d.js';

// PuppeteerAI - Implements boss B12: The Puppeteer
// Converts distant enemies into puppets over time.

export class PuppeteerAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.SphereGeometry(0.3 * radius, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xa29bfe });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 320, model: mesh });
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

  update(delta, enemies = [], gameHelpers) {
    if (!this.alive) return;
    this.timer += delta;
    moveTowards(this.position, this.moveTarget, 0.4, this.radius);
    if (this.position.distanceTo(this.moveTarget) < 0.05 * this.radius) {
      this.moveTarget = this.randomPos();
    }
    if (this.timer >= 4) {
      this.timer = 0;
      let farthest = null;
      let maxDist = 0;
      enemies.forEach(e => {
        if (!e.boss && !e.isPuppet) {
          const d = this.position.distanceTo(e.position);
          if (d > maxDist) { maxDist = d; farthest = e; }
        }
      });
      if (farthest) {
        farthest.isPuppet = true;
        if (gameHelpers && typeof gameHelpers.play === 'function') {
          gameHelpers.play('puppeteerConvert');
        }
      }
    }
  }
}
