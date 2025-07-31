import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { spherePosToUv } from '../utils.js';

// LoopingEyeAI - Implements boss B10: Looping Eye
// Teleports to random locations with a short warning.

export class LoopingEyeAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.SphereGeometry(0.35 * radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 320, model: mesh });

    this.radius = radius;
    this.lastTeleport = Date.now();
    this.teleportingAt = 0;
    this.teleportTarget = null;
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

    const interval = this.health < this.maxHealth * 0.25
      ? 1500
      : (this.health < this.maxHealth * 0.5 ? 2000 : 2500);

    if (!this.teleportingAt && Date.now() - this.lastTeleport > interval) {
      this.teleportingAt = Date.now() + 1000;
      this.teleportTarget = this.randomPos();
      gameHelpers?.play?.('chargeUpSound');
      if (gameHelpers?.spawnParticles) {
        const uv = spherePosToUv(this.position.clone().normalize(), this.radius);
        gameHelpers.spawnParticles(uv.u * 2048, uv.v * 1024, '#ffffff', 30, 4, 20);
      }
    }

    if (this.teleportingAt && Date.now() > this.teleportingAt) {
      this.position.copy(this.teleportTarget);
      this.lastTeleport = Date.now();
      this.teleportingAt = 0;
      this.teleportTarget = null;
      gameHelpers?.play?.('mirrorSwap');
      if (gameHelpers?.spawnParticles) {
        const uv = spherePosToUv(this.position.clone().normalize(), this.radius);
        gameHelpers.spawnParticles(uv.u * 2048, uv.v * 1024, '#ffffff', 30, 4, 20);
      }
    }
  }
}
