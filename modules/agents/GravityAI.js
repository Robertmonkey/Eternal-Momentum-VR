import { BaseAgent } from '../BaseAgent.js';
import { spawnProjectile } from '../ProjectileManager.js';
import { uvToSpherePos, spherePosToUv } from '../utils.js';

export class GravityAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.TorusKnotGeometry(0.3 * radius, 0.1 * radius, 64, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00008b });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 80, model: mesh });

    this.radius = radius;
    this.moveTarget = new THREE.Vector3();
    this.moveSpeed = 0.2; // units per second on sphere surface
    this.pullStrength = 0.5; // how strongly to pull the player
    this.attackTimer = 0;
    this.setRandomTarget();
  }

  setRandomTarget() {
    const u = Math.random();
    const v = Math.random();
    this.moveTarget.copy(uvToSpherePos(u, v, this.radius));
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

  move(delta) {
    const dir = this.moveTarget.clone().sub(this.position);
    const dist = dir.length();
    if (dist < 0.01) {
      this.setRandomTarget();
      return;
    }
    dir.normalize().multiplyScalar(this.moveSpeed * delta);
    this.position.add(dir);
    this.position.normalize().multiplyScalar(this.radius);
  }

  update(delta, playerPos2d, width, height, playerObj) {
    if (!this.alive) return;
    this.move(delta);
    this.applyGravity(playerObj, playerPos2d, width, height, delta);

    this.attackTimer += delta;
    if (this.attackTimer >= 6) {
      this.attackTimer = 0;
      const uv = spherePosToUv(this.position.clone().normalize(), this.radius);
      const px = uv.u * width;
      const py = uv.v * height;
      const dx = playerPos2d.x - px;
      const dy = playerPos2d.y - py;
      const len = Math.hypot(dx, dy) || 1;
      spawnProjectile({
        x: px,
        y: py,
        dx: (dx / len) * 0.7,
        dy: (dy / len) * 0.7,
        r: 9,
        damage: 6,
      });
    }
  }
}
