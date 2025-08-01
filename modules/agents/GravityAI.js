import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';

const ARENA_RADIUS = 50;

export class GravityAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.TorusKnotGeometry(0.7, 0.2, 64, 8);
    const material = new THREE.MeshStandardMaterial({
        color: 0x9b59b6,
        emissive: 0x9b59b6,
        emissiveIntensity: 0.5
    });
    super({ model: new THREE.Mesh(geometry, material) });

    const bossData = { id: "gravity", name: "Gravity Tyrant", maxHP: 168 };
    Object.assign(this, bossData);
    
    this.wells = [];
    this.wellObjects = new THREE.Group();
    this.add(this.wellObjects);

    for (let i = 0; i < 8; i++) {
        const well = { angle: i * (Math.PI / 4), dist: 8, radius: 2 }; // World units
        this.wells.push(well);
        
        const wellGeo = new THREE.TorusGeometry(well.radius, 0.2, 8, 24);
        const wellMat = new THREE.MeshBasicMaterial({ color: 0x9b59b6, transparent: true, opacity: 0.4 });
        const wellMesh = new THREE.Mesh(wellGeo, wellMat);
        this.wellObjects.add(wellMesh);
    }
  }

  update(delta) {
    if (!this.alive) return;

    this.wells.forEach((well, index) => {
        // Calculate well position in 3D space around the boss
        const bossPos = this.position.clone();
        const up = bossPos.clone().normalize();
        const forward = new THREE.Vector3(0, 0, 1);
        const right = new THREE.Vector3().crossVectors(up, forward).normalize();
        
        const angle = well.angle + (Date.now() * 0.0005); // Slow rotation
        const x = Math.cos(angle) * well.dist;
        const z = Math.sin(angle) * well.dist;

        const wellPos = bossPos.clone().add(right.multiplyScalar(x)).add(up.clone().cross(right).multiplyScalar(z));
        wellPos.normalize().multiplyScalar(ARENA_RADIUS);

        const wellMesh = this.wellObjects.children[index];
        if(wellMesh) {
            wellMesh.position.copy(wellPos);
            wellMesh.lookAt(0,0,0);
        }

        // Apply gravitational pull to the player
        const playerPos = state.player.position;
        const distance = playerPos.distanceTo(wellPos);
        if (distance < well.radius + state.player.r) {
            const pullDirection = wellPos.clone().sub(playerPos).normalize();
            const pullStrength = 1.0 - (distance / well.radius);
            playerPos.add(pullDirection.multiplyScalar(pullStrength * 0.1));
            playerPos.normalize().multiplyScalar(ARENA_RADIUS);
        }
    });
  }
}
