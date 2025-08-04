// BaseAgent.js - foundational 3D agent class
// Import a local copy of three.js instead of relying on a global THREE
import * as THREE from '../vendor/three.module.js';
import * as CoreManager from './CoreManager.js';

export class BaseAgent extends THREE.Group {
  constructor(options = {}) {
    super();
    const { health = 1, model = null, color = null, radius = 0.65 } = options;
    this.maxHealth = health;
    this.health = health;
    this.alive = true;
    if (model) {
      this.add(model);
      this.model = model;
    } else if (color !== null) {
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
      });
      const geometry = new THREE.SphereGeometry(radius, 32, 16);
      this.model = new THREE.Mesh(geometry, material);
      this.add(this.model);
    }
  }

  update(/* delta, player */) {
    // subclasses override
  }

  takeDamage(amount = 0, fromPlayer = false, gameHelpers = null) {
    if (!this.alive) return;
    if (!gameHelpers) gameHelpers = {};
    if (this.petrifiedUntil && this.petrifiedUntil > Date.now()) {
      amount *= 1.2;
    }
    this.health -= amount;
    if (fromPlayer) {
      CoreManager.onDamageDealt(this, gameHelpers);
    }
    if (this.health <= 0) this.die(gameHelpers);
  }

  die(gameHelpers = null) {
    if (!gameHelpers) gameHelpers = {};
    this.alive = false;
    CoreManager.onEnemyDeath(this, gameHelpers);
    if (this.parent) this.parent.remove(this);
  }
}
