import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { uvToSpherePos } from '../utils.js';

// MirrorMirageAI - Implements boss B6: Mirror Mirage
// The boss spawns two identical decoys plus the real form.
// Only the real one can be damaged. Every 10 seconds all
// three rapidly teleport to new random positions on the
// gameplay sphere. Striking a decoy causes it to vanish and
// respawn at a different location after a brief delay.

export class MirrorMirageAI extends BaseAgent {
  constructor(radius = 1) {
    super({ health: 240 });
    this.radius = radius;
    this.clones = [];
    this.realIndex = 0;
    this.swapTimer = 0;

    const geom = new THREE.OctahedronGeometry(0.3 * radius, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

    // Create three clones total (two decoys and the real one)
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

  teleportAll(gameHelpers) {
    this.clones.forEach(clone => {
      clone.position.copy(this.randomPos());
      clone.visible = true;
    });
    this.realIndex = Math.floor(Math.random() * this.clones.length);
    if (gameHelpers && typeof gameHelpers.play === 'function') {
      gameHelpers.play('mirrorSwap');
    }
  }

  /**
   * Called when an individual clone mesh is hit.
   * @param {THREE.Object3D} mesh - The clone mesh that was struck.
   * @param {number} [damage=0] - Damage to apply if this is the real clone.
   */
  hitClone(mesh, damage = 0, gameHelpers) {
    const index = this.clones.indexOf(mesh);
    if (index === -1) return;
    if (index === this.realIndex) {
      super.takeDamage(damage);
    } else {
      mesh.visible = false;
      setTimeout(() => {
        mesh.position.copy(this.randomPos());
        mesh.visible = true;
      }, 1000);
      if (gameHelpers && typeof gameHelpers.play === 'function') {
        gameHelpers.play('mirrorSwap');
      }
    }
  }

  update(delta, gameHelpers) {
    if (!this.alive) return;
    this.swapTimer += delta;
    if (this.swapTimer >= 10) {
      this.swapTimer = 0;
      this.teleportAll(gameHelpers);
      if (typeof this.onSwap === 'function') this.onSwap();
    }
  }
}
