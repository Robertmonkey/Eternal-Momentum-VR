import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class MirrorMirageAI extends BaseAgent {
  constructor() {
    super({ model: new THREE.Group() });

    const bossData = { id: "mirror", name: "Mirror Mirage", maxHP: 240 };
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;

    this.clones = [];
    const cloneGeo = new THREE.OctahedronGeometry(0.8, 0);
    const cloneMat = new THREE.MeshStandardMaterial({
        color: 0xff00ff,
        emissive: 0xff00ff,
        emissiveIntensity: 0.5
    });

    for (let i = 0; i < 5; i++) {
        const cloneMesh = new THREE.Mesh(cloneGeo, cloneMat);
        cloneMesh.userData.isClone = true;
        cloneMesh.userData.ai = this;
        this.clones.push(cloneMesh);
        this.model.add(cloneMesh);
    }

    this.realIndex = 0;
    this.lastSwapTime = Date.now();
    this.randomizeClones();
    this.updateGroupPosition();
  }

  randomPosOnSphere() {
      return new THREE.Vector3().randomDirection().multiplyScalar(ARENA_RADIUS);
  }

  randomizeClones() {
      this.clones.forEach(clone => {
          clone.position.copy(this.randomPosOnSphere());
          clone.visible = true;
      });
  }

  updateGroupPosition() {
      const realClone = this.clones[this.realIndex];
      const offset = realClone.position.clone();
      this.position.copy(offset);
      this.clones.forEach(c => c.position.sub(offset));
  }

  swapClones() {
      const realClone = this.clones[this.realIndex];
      let idx;
      do {
          idx = Math.floor(Math.random() * this.clones.length);
      } while (idx === this.realIndex);
      const otherClone = this.clones[idx];
      const temp = realClone.position.clone();
      realClone.position.copy(otherClone.position);
      otherClone.position.copy(temp);
      this.realIndex = idx;
      this.updateGroupPosition();
      gameHelpers.play('mirrorSwap');
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();
    if (now - this.lastSwapTime > 2000) {
      this.lastSwapTime = now;
      this.swapClones();
    }
  }

  takeDamage(amount, sourceObject, hitMesh) {
    if (!this.alive) return;
    const realClone = this.clones[this.realIndex];

    if (hitMesh === realClone) {
        super.takeDamage(amount, sourceObject);
    } else if (hitMesh && this.clones.includes(hitMesh)) {
        hitMesh.visible = false;
        setTimeout(() => {
            if (this.alive) {
                hitMesh.position.copy(this.randomPosOnSphere().sub(this.position));
                hitMesh.visible = true;
            }
        }, 1500);
        gameHelpers.play('magicDispelSound');
    }
  }
}
