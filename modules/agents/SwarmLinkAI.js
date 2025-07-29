import { BaseAgent } from '../BaseAgent.js';
import { spawnProjectile } from '../ProjectileManager.js';
import { uvToSpherePos, spherePosToUv } from '../utils.js';

export class SwarmLinkAI extends BaseAgent {
  constructor(radius = 1) {
    super({ health: 90 });
    this.radius = radius;
    this.minions = [];
    this.links = [];

    const geom = new THREE.IcosahedronGeometry(0.25 * radius, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(geom, mat.clone());
      const u = Math.random();
      const v = Math.random();
      mesh.position.copy(uvToSpherePos(u, v, radius));
      this.add(mesh);
      this.minions.push({ mesh, health: 30, attackTimer: Math.random() * 4 });
    }

    const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.5 });
    for (let i = 0; i < this.minions.length; i++) {
      for (let j = i + 1; j < this.minions.length; j++) {
        const pts = [this.minions[i].mesh.position, this.minions[j].mesh.position];
        const geometry = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(geometry, lineMat.clone());
        this.add(line);
        this.links.push({ line, i, j });
      }
    }
  }

  update(delta, playerPos2d, width, height) {
    if (!this.alive) return;

    // update link geometry
    this.links.forEach(l => {
      if (!this.minions[l.i] || !this.minions[l.j]) {
        l.line.visible = false;
        return;
      }
      l.line.geometry.setFromPoints([
        this.minions[l.i].mesh.position,
        this.minions[l.j].mesh.position,
      ]);
    });

    this.minions.forEach((m, idx) => {
      if (!m.alive) return;
      m.attackTimer += delta;
      if (m.attackTimer >= 4) {
        m.attackTimer = 0;
        const uv = spherePosToUv(m.mesh.position.clone().normalize(), this.radius);
        const dx = playerPos2d.x - uv.u * width;
        const dy = playerPos2d.y - uv.v * height;
        const len = Math.hypot(dx, dy) || 1;
        spawnProjectile({
          x: uv.u * width,
          y: uv.v * height,
          dx: (dx / len) * 0.5,
          dy: (dy / len) * 0.5,
          r: 6,
          damage: 4,
        });
      }
    });
  }

  damageMinion(index, amount) {
    const m = this.minions[index];
    if (!m || !this.alive) return;
    m.health -= amount;
    this.health -= amount;
    if (m.health <= 0) {
      m.alive = false;
      this.remove(m.mesh);
    }
    if (this.health <= 0) {
      this.die();
    }
  }
}
