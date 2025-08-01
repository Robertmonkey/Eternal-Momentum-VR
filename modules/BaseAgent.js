// BaseAgent.js - foundational 3D agent class
// Import a local copy of three.js instead of relying on a global THREE
import * as THREE from '../vendor/three.module.js';
import * as CoreManager from './CoreManager.js';

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
