import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';

// TemporalParadoxAI - Implements boss B22: The Temporal Paradox
// Records player movement and replays a damaging echo.

export class TemporalParadoxAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.SphereGeometry(0.35 * radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x81ecec });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 420, model: mesh });

    this.radius = radius;
    this.history = [];
    this.lastEcho = 0;
  }

  update(delta, playerObj, state, gameHelpers) {
    if (!this.alive || !playerObj) return;

    this.history.push({ pos: playerObj.position.clone(), time: Date.now() });
    this.history = this.history.filter(h => Date.now() - h.time < 5000);

    if (Date.now() - this.lastEcho > 8000) {
      this.lastEcho = Date.now();
      gameHelpers?.play?.('phaseShiftSound');
      state?.effects?.push({ type: 'paradox_echo', path: [...this.history] });
    }
  }
}
