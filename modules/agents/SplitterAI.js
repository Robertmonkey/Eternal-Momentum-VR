import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class SplitterAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.IcosahedronGeometry(0.8, 0);
    const material = new THREE.MeshStandardMaterial({
        color: 0xff4500,
        emissive: 0xff4500,
        emissiveIntensity: 0.5,
    });
    const model = new THREE.Mesh(geometry, material)
    super({ health: 96, model });
    this.name = "Splitter Sentinel";
    this.kind = "splitter";
  }

  die() {
    if (!this.alive) return;
    super.die(); // This sets this.alive = false
    gameHelpers.play('splitterOnDeath');
    this.triggerAbilityAnimation(1, 1200);

    const spawnInOrbit = (count, orbitRadius) => {
        const centerVec = this.position.clone().normalize();
        const upVec = new THREE.Vector3(0, 1, 0).cross(centerVec).length() > 0.1 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const basisA = new THREE.Vector3().crossVectors(centerVec, upVec).normalize();
        const basisB = new THREE.Vector3().crossVectors(centerVec, basisA).normalize();

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * 2 * Math.PI;
            const offset = basisA.clone().multiplyScalar(Math.cos(angle) * orbitRadius)
                             .add(basisB.clone().multiplyScalar(Math.sin(angle) * orbitRadius));
            
            const spawnPos = this.position.clone().add(offset).normalize().multiplyScalar(ARENA_RADIUS);
            
            const minion = gameHelpers.spawnEnemy(false);
            if (minion) {
                minion.position.copy(spawnPos);
            }
        }
    };

    spawnInOrbit(6, 6); // First wave
    setTimeout(() => { if (state.bossActive) spawnInOrbit(6, 12) }, 1000); // Second wave
  }
}
