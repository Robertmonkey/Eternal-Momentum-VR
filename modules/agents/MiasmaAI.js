import { BaseAgent } from '../BaseAgent.js';

// MiasmaAI - Implements boss B21: The Miasma
// Periodically fills the arena with toxic gas that damages the player
// unless vented.

export class MiasmaAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.SphereGeometry(0.4 * radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x6ab04c });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 400, model: mesh });

    this.radius = radius;
    this.isGasActive = false;
    this.lastGas = 0;
  }

  update(delta, playerObj, state, gameHelpers) {
    if (!this.alive) return;
    if (!playerObj) return;

    if (!this.isGasActive && Date.now() - this.lastGas > 10000) {
      this.isGasActive = true;
      this.lastGas = Date.now();
      gameHelpers?.play?.('miasmaGasRelease');
    }

    if (this.isGasActive) {
      if (playerObj.position.distanceTo(this.position) < this.radius * 2) {
        if (typeof playerObj.health === 'number') {
          playerObj.health -= 0.2 * delta;
        }
      }
      if (Date.now() - this.lastGas > 6000) {
        this.isGasActive = false;
      }
    }
  }
}
