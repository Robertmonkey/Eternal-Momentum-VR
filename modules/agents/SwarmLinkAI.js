import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { uvToSpherePos, spherePosToUv, toCanvasPos } from '../utils.js';
import * as CoreManager from '../CoreManager.js';

export class SwarmLinkAI extends BaseAgent {
  constructor(radius = 1) {
    super({ health: 200 });
    this.radius = radius;
    const geom = new THREE.IcosahedronGeometry(0.25 * radius, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    this.minions = [];
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(geom.clone(), mat.clone());
      mesh.position.copy(this.randomPos());
      this.add(mesh);
      this.minions.push({ mesh, lastShot: Date.now() });
    }
  }

  randomPos() {
    const u = Math.random();
    const v = Math.random();
    return uvToSpherePos(u, v, this.radius);
  }

  update(delta, playerObj, state) {
    if (!this.alive) return;
    this.minions.forEach(m => {
      if (playerObj) m.mesh.lookAt(playerObj.position);
      if (playerObj && Date.now() - m.lastShot > 4000) {
        m.lastShot = Date.now();
        const fromPos = m.mesh.position.clone();
        const toPos = playerObj.position.clone();
        const vel = toPos.sub(fromPos).normalize().multiplyScalar(0.25);
        state?.effects?.push({ type: 'nova_bullet', caster: this, position: fromPos.clone(), velocity: vel, r: 4, color: '#ffff00', damage: 6 });
      }
    });
  }

  checkCollision(playerObj, width, height) {
    this.minions.forEach(m => {
      const uv = spherePosToUv(m.mesh.position.clone().normalize(), this.radius);
      const playerPos = toCanvasPos(playerObj.position.clone().normalize(), width, height);
      const dx = playerPos.x - uv.u * width;
      const dy = playerPos.y - uv.v * height;
      if (Math.hypot(dx, dy) < (playerObj.r || 0) + 8 && !playerObj.shield) {
        playerObj.health -= 0.25;
        CoreManager.onPlayerDamage(0.25, this, null);
      }
    });
  }
}
