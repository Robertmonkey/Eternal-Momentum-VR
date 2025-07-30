// BaseAgent.js - foundational 3D agent class
// Import a local copy of three.js instead of relying on a global THREE
import * as THREE from '../vendor/three.module.js';

export class BaseAgent extends THREE.Group {
  constructor(options = {}) {
    super();
    const { health = 1, model = null } = options;
    this.maxHealth = health;
    this.health = health;
    this.alive = true;
    if (model) this.add(model);
  }

  update(/* delta, player */) {
    // subclasses override
  }

  takeDamage(amount = 0) {
    if (!this.alive) return;
    this.health -= amount;
    if (this.health <= 0) this.die();
  }

  die() {
    this.alive = false;
    if (this.parent) this.parent.remove(this);
  }
}
