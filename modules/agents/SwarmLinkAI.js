import { BaseAgent } from '../BaseAgent.js';
import { spherePosToUv } from '../utils.js';

export class SwarmLinkAI extends BaseAgent {
  constructor(radius = 1) {
    super({ health: 200 });
    this.radius = radius;
    const geom = new THREE.IcosahedronGeometry(0.25 * radius, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const mesh = new THREE.Mesh(geom, mat);
    this.add(mesh);
    this.head = mesh;
    this.chain = [];
    for (let i = 0; i < 150; i++) {
      const pos = this.head.position.clone();
      this.chain.push(pos.clone());
    }
  }

  update() {
    if (!this.alive) return;
    let prev = this.head.position;
    this.chain.forEach(seg => {
      seg.lerp(prev, 0.2);
      prev = seg;
    });
  }

  checkCollision(playerObj, width, height) {
    const uvHead = spherePosToUv(this.head.position.clone().normalize(), this.radius);
    const playerPos = { x: playerObj.x, y: playerObj.y };
    this.chain.forEach(seg => {
      const uv = spherePosToUv(seg.clone().normalize(), this.radius);
      const dx = playerPos.x - uv.u * width;
      const dy = playerPos.y - uv.v * height;
      if (Math.hypot(dx, dy) < (playerObj.r || 0) + 8) {
        if (!playerObj.shield) {
          playerObj.health -= 0.25;
        }
      }
    });
  }
}
