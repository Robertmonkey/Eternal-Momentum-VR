import { BaseAgent } from '../BaseAgent.js';
import { uvToSpherePos, spherePosToUv } from '../utils.js';

export class GravityAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.TorusKnotGeometry(0.3 * radius, 0.1 * radius, 64, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00008b });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 168, model: mesh });

    this.radius = radius;
    this.pullStrength = 0.5;
    this.wells = [];
    for (let i = 0; i < 8; i++) {
      this.wells.push({ angle: i * (Math.PI / 4), dist: 150, r: 30 });
    }
  }

  applyGravity(playerObj, playerPos2d, width, height, delta) {
    if (!playerObj) return;
    const uv = spherePosToUv(this.position.clone().normalize(), this.radius);
    const px = uv.u * width;
    const py = uv.v * height;
    const dx = px - playerPos2d.x;
    const dy = py - playerPos2d.y;
    playerObj.x += dx * this.pullStrength * delta;
    playerObj.y += dy * this.pullStrength * delta;
  }

  update(delta, playerPos2d, width, height, playerObj) {
    if (!this.alive) return;
    this.applyGravity(playerObj, playerPos2d, width, height, delta);

    const cu = this.position.clone().normalize();
    const centerVec = cu;
    const basisA = new THREE.Vector3(centerVec.z, 0, -centerVec.x).normalize();
    const basisB = new THREE.Vector3().crossVectors(centerVec, basisA).normalize();

    this.wells.forEach(w => {
      const angRadius = (w.dist / width) * 2 * Math.PI;
      const offset = basisA.clone().multiplyScalar(Math.cos(w.angle) * angRadius)
        .add(basisB.clone().multiplyScalar(Math.sin(w.angle) * angRadius));
      const pos = centerVec.clone().add(offset).normalize();
      const uv = spherePosToUv(pos, 1);
      const wellX = uv.u * width;
      const wellY = uv.v * height;
      const dx = playerPos2d.x - wellX;
      const dy = playerPos2d.y - wellY;
      if (Math.hypot(dx, dy) < w.r + (playerObj?.r || 0)) {
        playerObj.x -= dx * 0.05;
        playerObj.y -= dy * 0.05;
      }
    });
  }
}
