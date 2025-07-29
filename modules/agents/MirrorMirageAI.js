import { BaseAgent } from '../BaseAgent.js';
import { uvToSpherePos } from '../utils.js';

// MirrorMirageAI - Implements boss B6: Mirror Mirage
// The boss creates two identical clones. Only one is real and
// can take damage. Every 10 seconds all clones, including the
// real one, teleport to new random positions on the sphere.
// Hitting a clone causes it to disappear briefly before
// respawning elsewhere.

export class MirrorMirageAI extends BaseAgent {
  constructor(radius = 1) {
    super({ health: 70 });
    this.radius = radius;
    this.clones = [];
    this.realIndex = 0;
    this.swapTimer = 0;

    const geom = new THREE.OctahedronGeometry(0.3 * radius, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

    // Create three clones
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(geom.clone(), mat.clone());
      this.add(mesh);
      this.clones.push(mesh);
    }

    this.teleportAll();
  }

  randomPos() {
    const u = Math.random();
    const v = Math.random();
    return uvToSpherePos(u, v, this.radius);
  }

  teleportAll() {
    this.clones.forEach(clone => clone.position.copy(this.randomPos()));
    this.realIndex = Math.floor(Math.random() * this.clones.length);
  }

  /**
   * Called when an individual clone mesh is hit.
   * @param {THREE.Object3D} mesh - The clone mesh that was struck.
   * @param {number} [damage=0] - Damage to apply if this is the real clone.
   */
  hitClone(mesh, damage = 0) {
    const index = this.clones.indexOf(mesh);
    if (index === -1) return;
    if (index === this.realIndex) {
      super.takeDamage(damage);
    } else {
      // Fake clone: vanish and respawn at a new position
      mesh.visible = false;
      setTimeout(() => {
        mesh.position.copy(this.randomPos());
        mesh.visible = true;
      }, 500);
    }
  }

  update(delta) {
    if (!this.alive) return;
    this.swapTimer += delta;
    if (this.swapTimer >= 10) {
      this.swapTimer = 0;
      this.teleportAll();
      if (typeof this.onSwap === 'function') this.onSwap();
    }
  }
}
