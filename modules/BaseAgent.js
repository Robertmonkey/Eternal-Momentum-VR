// BaseAgent.js - foundational 3D agent class
// Relies on global THREE namespace (provided by A-Frame or tests)

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
