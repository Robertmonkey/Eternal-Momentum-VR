import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class MirrorMirageAI extends BaseAgent {
  constructor() {
    // The main object is just a group; the visible parts are its children (clones)
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
        cloneMesh.userData.isClone = true; // Mark for raycasting
        cloneMesh.userData.ai = this; // Link back to parent AI
        this.clones.push(cloneMesh);
        this.model.add(cloneMesh);
    }
    
    this.teleportAllClones();
    this.lastSwapTime = Date.now();
  }
  
  randomPosOnSphere() {
      return new THREE.Vector3().randomDirection().multiplyScalar(ARENA_RADIUS);
  }

  teleportAllClones() {
      this.clones.forEach(clone => {
          clone.position.copy(this.randomPosOnSphere());
          clone.visible = true;
      });
      // The "real" boss's position is just the position of one of its clones
      this.position.copy(this.clones[0].position);
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    if (now - this.lastSwapTime > 4000) {
      this.lastSwapTime = now;
      
      const realClone = this.clones.find(c => c.position.equals(this.position));
      let otherClone = this.clones[Math.floor(Math.random() * this.clones.length)];
      while(otherClone === realClone) {
          otherClone = this.clones[Math.floor(Math.random() * this.clones.length)];
      }

      // Swap positions
      const tempPos = realClone.position.clone();
      realClone.position.copy(otherClone.position);
      otherClone.position.copy(tempPos);
      this.position.copy(realClone.position);

      gameHelpers.play('mirrorSwap');
    }
  }

  takeDamage(amount, sourceObject, hitMesh) {
    if (!this.alive) return;

    // Determine if the hit mesh is the real one
    if (hitMesh && hitMesh.position.equals(this.position)) {
        // It's the real one
        super.takeDamage(amount, sourceObject);
    } else if (hitMesh) {
        // It's a decoy
        hitMesh.visible = false;
        setTimeout(() => {
            if (this.alive) {
                hitMesh.position.copy(this.randomPosOnSphere());
                hitMesh.visible = true;
            }
        }, 1500);
        gameHelpers.play('magicDispelSound');
    }
  }
}
