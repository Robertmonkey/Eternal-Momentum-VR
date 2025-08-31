import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';

const ARENA_RADIUS = 50;

export class GravityAI extends BaseAgent {
  constructor() {
    const bossData = { id: "gravity", name: "Gravity Tyrant", maxHP: 168 };
    super({ health: bossData.maxHP, color: 0x9b59b6, kind: bossData.id });

    this.name = bossData.name;
    this.wells = [];
    this.wellObjects = new THREE.Group();
    this.add(this.wellObjects);

    for (let i = 0; i < 8; i++) {
        const well = { angle: i * (Math.PI / 4), dist: 5, radius: 1 }; // World units
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
        const bossPos = this.getWorldPosition(new THREE.Vector3());
        const up = bossPos.clone().normalize();

        // Build an orthonormal basis for the tangent plane at the boss position.
        // Pick a reference axis that is not parallel with the surface normal to
        // avoid zero-length cross products when the boss is near the poles.
        const reference = Math.abs(up.dot(new THREE.Vector3(0, 1, 0))) > 0.9
            ? new THREE.Vector3(1, 0, 0)
            : new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(reference, up).normalize();
        const forward = new THREE.Vector3().crossVectors(up, right).normalize();

        const angle = well.angle + (Date.now() * 0.0005); // Slow rotation
        const x = Math.cos(angle) * well.dist;
        const z = Math.sin(angle) * well.dist;

        const worldWellPos = bossPos.clone()
            .add(right.multiplyScalar(x))
            .add(forward.multiplyScalar(z))
            .normalize()
            .multiplyScalar(ARENA_RADIUS);

        const localWellPos = worldWellPos.clone().sub(bossPos);
        const wellMesh = this.wellObjects.children[index];
        if (wellMesh) {
            wellMesh.position.copy(localWellPos);
            wellMesh.lookAt(this.worldToLocal(new THREE.Vector3(0, 0, 0)));
        }

        // Apply gravitational pull to the player
        const playerPos = state.player.position;
        const offset = worldWellPos.clone().sub(playerPos);
        const distance = offset.length();
        if (distance < well.radius + state.player.r) {
            playerPos.add(offset.multiplyScalar(0.05));
            playerPos.normalize().multiplyScalar(ARENA_RADIUS);
        }
    });
  }
}
