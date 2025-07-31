import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { moveTowards } from '../movement3d.js';

// JuggernautAI - Implements boss B11: The Juggernaut
// Aggressive boss that periodically charges at the player.

export class JuggernautAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.SphereGeometry(0.35 * radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x636e72 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 360, model: mesh });

    this.radius = radius;
    this.state = 'ROAMING';
    this.timer = 0;
    this.target = this.randomPos();
    this.lastCharge = Date.now();
    this.isCharging = false;
    this.bouncesLeft = 0;
  }

  randomPos() {
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.random() * Math.PI;
    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * this.radius,
      Math.cos(phi) * this.radius,
      Math.sin(phi) * Math.sin(theta) * this.radius
    );
  }

  update(delta, playerObj, gameHelpers) {
    if (!this.alive) return;
    this.timer += delta;

    const speedMult = 1 + (1 - this.health / this.maxHealth) * 2.5;

    if (!this.isCharging) {
      moveTowards(this.position, this.target, 0.8 * speedMult, this.radius);
      if (this.position.distanceTo(this.target) < 0.05 * this.radius) {
        this.target = this.randomPos();
      }

      if (Date.now() - this.lastCharge > 7000) {
        this.isCharging = true;
        this.bouncesLeft = 2;
        this.chargeTarget = playerObj?.position ? playerObj.position.clone() : this.randomPos();
        gameHelpers?.play?.('chargeUpSound');
        this.chargeStart = Date.now() + 1000;
      }
    } else {
      if (Date.now() < this.chargeStart) return;

      moveTowards(this.position, this.chargeTarget, 6 * speedMult, this.radius);
      if (this.position.distanceTo(this.chargeTarget) < 0.05 * this.radius) {
        this.chargeTarget = this.randomPos();
        this.bouncesLeft--;
      }
      if (this.bouncesLeft < 0) {
        this.isCharging = false;
        this.lastCharge = Date.now();
        this.target = this.randomPos();
      }
    }
  }
}
