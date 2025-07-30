import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';

// Aethel & Umbra duo implementation (Boss B9)
// Each agent is instantiated separately but can reference a partner.

export class AethelAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.DodecahedronGeometry(0.3 * radius);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, emissive: 0xffffff });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 180, model: mesh });
    this.radius = radius;
    this.timer = 0;
    this.partner = null;
  }

  update(delta, gameHelpers) {
    if (!this.alive) return;
    this.timer += delta;
    if (this.timer >= 6) {
      this.timer = 0;
      if (gameHelpers && typeof gameHelpers.spawnHealingZone === 'function') {
        gameHelpers.spawnHealingZone(this.position.clone(), 0.5 * this.radius, 5);
      }
    }
  }

  die() {
    super.die();
    if (!this.partner || !this.partner.alive) {
      if (typeof this.onBothDeath === 'function') this.onBothDeath();
    }
  }
}

export class UmbraAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.TetrahedronGeometry(0.3 * radius);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 220, model: mesh });
    this.radius = radius;
    this.timer = 0;
    this.partner = null;
  }

  update(delta, gameHelpers, targetPos) {
    if (!this.alive) return;
    this.timer += delta;
    if (this.timer >= 2) {
      this.timer = 0;
      if (gameHelpers && typeof gameHelpers.spawnProjectile === 'function') {
        gameHelpers.spawnProjectile(this.position.clone(), targetPos);
      }
    }
  }

  die() {
    super.die();
    if (!this.partner || !this.partner.alive) {
      if (typeof this.onBothDeath === 'function') this.onBothDeath();
    }
  }
}
