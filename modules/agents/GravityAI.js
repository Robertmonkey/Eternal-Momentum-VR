import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { uvToSpherePos, spherePosToUv, toCanvasPos } from '../utils.js';

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
    this.target = this.randomPos();
    this.lastShot = Date.now();
  }

  randomPos() {
    const u = Math.random();
    const v = Math.random();
    return uvToSpherePos(u, v, this.radius);
  }

  applyGravity(playerObj, width, height, delta) {
    if (!playerObj) return;
    const uv = spherePosToUv(this.position.clone().normalize(), this.radius);
    const px = uv.u * width;
    const py = uv.v * height;
    const player2d = toCanvasPos(playerObj.position.clone().normalize(), width, height);
    const dx = px - player2d.x;
    const dy = py - player2d.y;
    player2d.x += dx * this.pullStrength * delta;
    player2d.y += dy * this.pullStrength * delta;
    playerObj.position.copy(
      uvToSpherePos(player2d.x / width, player2d.y / height, this.radius)
    );
  }

  update(delta, width, height, playerObj, state) {
    if (!this.alive) return;
    this.applyGravity(playerObj, width, height, delta);

    // slow roaming movement
    this.position.lerp(this.target, delta * 0.05);
    if (this.position.distanceTo(this.target) < 0.05 * this.radius) {
      this.target = this.randomPos();
    }

    // fire projectile every 6 seconds
    if (playerObj && Date.now() - this.lastShot > 6000) {
      this.lastShot = Date.now();
      const fromPos = this.position.clone();
      const toPos = playerObj.position.clone();
      const vel = toPos.sub(fromPos).normalize().multiplyScalar(0.2);
      state?.effects?.push({ type: 'nova_bullet', caster: this, position: fromPos.clone(), velocity: vel, r: 5, color: '#00008b', damage: 12 });
    }

    const cu = this.position.clone().normalize();
    const centerVec = cu;
    const basisA = new THREE.Vector3(centerVec.z, 0, -centerVec.x).normalize();
    const basisB = new THREE.Vector3().crossVectors(centerVec, basisA).normalize();

    let playerPos2d = toCanvasPos(playerObj.position.clone().normalize(), width, height);
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
        playerPos2d.x -= dx * 0.05;
        playerPos2d.y -= dy * 0.05;
      }
    });
    playerObj.position.copy(
      uvToSpherePos(playerPos2d.x / width, playerPos2d.y / height, this.radius)
    );
  }
}
