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

  update(delta, playerObj, gameHelpers) {
    if (!this.alive) return;
    if (this.partner && this.partner.alive && playerObj) {
      const playerPos = playerObj.position;
      const pVec = playerPos.clone().sub(this.position).normalize();
      const perp = new THREE.Vector3().crossVectors(pVec, this.partner.position.clone().sub(this.position)).normalize();
      const target = playerPos.clone().add(perp.multiplyScalar(0.2 * this.radius));
      moveTowards(this.position, target, 0.5, this.radius);
      const beamFn = gameHelpers?.drawBeam;
      if (beamFn) beamFn(this.position, this.partner.position);

      // damage when player crosses beam
      const a = this.position;
      const b = this.partner.position;
      const ap = playerPos.clone().sub(a);
      const ab = b.clone().sub(a);
      const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.lengthSq()));
      const closest = a.clone().add(ab.multiplyScalar(t));
      if (closest.distanceTo(playerPos) < (playerObj.r || 0.05) + 0.05) {
        if (typeof playerObj.health === 'number') playerObj.health -= 1;
      }
    } else {
      moveTowards(this.position, this.moveTarget, 0.3, this.radius);
      if (this.position.distanceTo(this.moveTarget) < 0.05 * this.radius) {
        this.moveTarget = this.randomPos();
      }
    }
  }

  takeDamage(amount, gameHelpers) {
    super.takeDamage(amount, true, gameHelpers);
    if (this.partner) this.partner.health = this.health;
  }

  die() {
    if (this.partner && this.partner.alive) this.partner.health = 0;
    super.die();
  }
}
