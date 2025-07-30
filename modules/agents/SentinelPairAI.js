import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { moveTowards } from '../movement3d.js';

// SentinelPairAI - Implements boss B14: Sentinel Pair
// Two agents share one health pool and project a damaging beam between them.

export class SentinelPairAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.SphereGeometry(0.28 * radius, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 400, model: mesh });

    this.radius = radius;
    this.partner = null;
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

  update(delta, playerPos, gameHelpers) {
    if (!this.alive) return;
    if (this.partner && this.partner.alive) {
      const pVec = playerPos.clone().sub(this.position).normalize();
      const perp = new THREE.Vector3().crossVectors(pVec, this.partner.position.clone().sub(this.position)).normalize();
      const target = playerPos.clone().add(perp.multiplyScalar(0.2 * this.radius));
      moveTowards(this.position, target, 0.5, this.radius);
      if (gameHelpers && typeof gameHelpers.drawBeam === 'function') {
        gameHelpers.drawBeam(this.position, this.partner.position);
      }
    } else {
      moveTowards(this.position, this.moveTarget, 0.3, this.radius);
      if (this.position.distanceTo(this.moveTarget) < 0.05 * this.radius) {
        this.moveTarget = this.randomPos();
      }
    }
  }

  takeDamage(amount) {
    super.takeDamage(amount);
    if (this.partner) this.partner.health = this.health;
  }

  die() {
    if (this.partner && this.partner.alive) this.partner.health = 0;
    super.die();
  }
}
