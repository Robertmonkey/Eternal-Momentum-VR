import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';

// ObeliskAI - Implements boss B26: The Obelisk
// Invulnerable until three conduits are destroyed.

export class ObeliskConduitAI extends BaseAgent {
  constructor(parent, angle, radius) {
    const geom = new THREE.SphereGeometry(0.1 * radius, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x8e44ad });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 150, model: mesh });
    this.parentObelisk = parent;
    this.orbit = angle;
    this.radius = radius;
  }

  update(delta) {
    const t = Date.now() / 2000 + this.orbit;
    this.position.set(
      this.parentObelisk.position.x + Math.cos(t) * this.radius,
      this.parentObelisk.position.y,
      this.parentObelisk.position.z + Math.sin(t) * this.radius
    );
  }
}

export class ObeliskAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.CylinderGeometry(0.3 * radius, 0.3 * radius, 1 * radius, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0x2c3e50 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 800, model: mesh });

    this.radius = radius;
    this.invulnerable = true;
    this.conduits = [];
    for (let i = 0; i < 3; i++) {
      const c = new ObeliskConduitAI(this, (i / 3) * Math.PI * 2, 1.5 * radius);
      this.add(c);
      this.conduits.push(c);
    }
  }

  update(delta, playerObj, state, gameHelpers) {
    if (!this.alive) return;

    this.conduits = this.conduits.filter(c => c.alive);
    if (this.invulnerable && this.conduits.length === 0) {
      this.invulnerable = false;
    }
  }

  takeDamage(amount) {
    if (this.invulnerable) return;
    super.takeDamage(amount);
  }
}
