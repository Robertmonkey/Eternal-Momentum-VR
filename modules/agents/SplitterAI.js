import { BaseAgent } from '../BaseAgent.js';

export class SplitterAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.SphereGeometry(0.3 * radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, emissive: 0xff0000 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 96, model: mesh });
    this.radius = radius;
  }

  update() {
    // Splitter Sentinel is stationary and does not attack in the
    // original game.  The VR version mirrors that behavior.
    if (!this.alive) return;
  }

  die() {
    super.die();
    if (typeof this.onDeath === 'function') this.onDeath();
  }
}
