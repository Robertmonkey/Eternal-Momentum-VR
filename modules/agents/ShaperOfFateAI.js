import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';

// ShaperOfFateAI - Implements boss B29: The Shaper of Fate
// Creates runes that determine its next attack based on player proximity.

export class ShaperOfFateAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.OctahedronGeometry(0.4 * radius);
    const mat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 600, model: mesh });

    this.radius = radius;
    this.phase = 'idle';
    this.phaseTimer = Date.now() + 3000;
    this.runes = [];
  }

  update(delta, playerObj, state, gameHelpers) {
    const now = Date.now();
    if (!this.alive || !playerObj) return;

    if (this.phase === 'idle' && now > this.phaseTimer) {
      this.phase = 'prophecy';
      this.phaseTimer = now + 5000;
      this.runes = [
        { pos: playerObj.position.clone().add(new THREE.Vector3(1,0,0).multiplyScalar(this.radius)), type: 'nova' },
        { pos: playerObj.position.clone().add(new THREE.Vector3(-1,0,0).multiplyScalar(this.radius)), type: 'shockwave' },
        { pos: playerObj.position.clone().add(new THREE.Vector3(0,0,1).multiplyScalar(this.radius)), type: 'heal' }
      ];
    } else if (this.phase === 'prophecy' && now > this.phaseTimer) {
      this.phase = 'fulfillment';
      this.phaseTimer = now + 3000;
      let closest = this.runes[0];
      let minDist = playerObj.position.distanceTo(this.runes[0].pos);
      this.runes.forEach(r => {
        const d = playerObj.position.distanceTo(r.pos);
        if (d < minDist) { closest = r; minDist = d; }
      });
      if (closest.type === 'heal') {
        this.health = Math.min(this.maxHealth, this.health + 30);
      }
      gameHelpers?.play?.('shaperAttune');
      this.runes = [];
    } else if (this.phase === 'fulfillment' && now > this.phaseTimer) {
      this.phase = 'idle';
      this.phaseTimer = now + 5000;
    }
  }
}
