import { BaseAgent } from '../BaseAgent.js';
import { spawnProjectile } from '../ProjectileManager.js';
import { uvToSpherePos, spherePosToUv } from '../utils.js';

class SwarmMinion extends BaseAgent {
  constructor(manager, radius) {
    const geom = new THREE.IcosahedronGeometry(0.2 * radius, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: manager.maxHealth / 3, model: mesh });
    this.manager = manager;
    this.attackTimer = 0;
  }

  update(delta, playerPos2d, width, height) {
    if (!this.alive) return;
    this.attackTimer += delta;
    if (this.attackTimer >= 4) {
      this.attackTimer = 0;
      const uv = spherePosToUv(this.position.clone().normalize(), this.manager.radius);
      const px = uv.u * width;
      const py = uv.v * height;
      const dx = playerPos2d.x - px;
      const dy = playerPos2d.y - py;
      const len = Math.hypot(dx, dy) || 1;
      spawnProjectile({
        x: px,
        y: py,
        dx: (dx / len) * 0.6,
        dy: (dy / len) * 0.6,
        r: 7,
        damage: 4
      });
    }
  }

  takeDamage(amount) {
    if (!this.alive) return;
    super.takeDamage(amount);
    this.manager.health = Math.max(0, this.manager.health - amount);
    if (!this.alive) this.manager.handleMinionDeath(this);
  }
}

export class SwarmLinkAI extends BaseAgent {
  constructor(radius = 1) {
    super({ health: 90 });
    this.radius = radius;
    this.minions = [];
    this.lines = [];

    for (let i = 0; i < 3; i++) {
      const m = new SwarmMinion(this, radius);
      const pos = uvToSpherePos(Math.random(), Math.random(), radius);
      m.position.copy(pos);
      this.add(m);
      this.minions.push(m);
    }

    const pairs = [
      [0, 1],
      [1, 2],
      [2, 0]
    ];
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true });
    for (const [a, b] of pairs) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        this.minions[a].position,
        this.minions[b].position
      ]);
      const line = new THREE.Line(geometry, lineMat.clone());
      this.add(line);
      this.lines.push({ line, a, b });
    }
  }

  handleMinionDeath(minion) {
    const idx = this.minions.indexOf(minion);
    if (idx !== -1) {
      this.lines.forEach(link => {
        if (link.a === idx || link.b === idx) link.line.visible = false;
      });
    }
    if (this.minions.every(m => !m.alive)) this.die();
  }

  update(delta, playerPos2d, width, height) {
    if (!this.alive) return;
    for (const link of this.lines) {
      link.line.material.opacity = 0.5 + Math.random() * 0.5;
      const posA = this.minions[link.a].position;
      const posB = this.minions[link.b].position;
      const arr = link.line.geometry.attributes.position.array;
      arr[0] = posA.x; arr[1] = posA.y; arr[2] = posA.z;
      arr[3] = posB.x; arr[4] = posB.y; arr[5] = posB.z;
      link.line.geometry.attributes.position.needsUpdate = true;
    }
    this.minions.forEach(m => m.update(delta, playerPos2d, width, height));
  }

  takeDamage(amount, targetIndex = 0) {
    if (!this.alive) return;
    const m = this.minions[targetIndex];
    if (m) m.takeDamage(amount);
  }
}
