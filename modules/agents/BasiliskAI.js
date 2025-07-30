import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';

// BasiliskAI - Implements boss B15: The Basilisk
// Generates four stasis zones that grow as health drops. Remaining inside
// a zone for too long petrifies and stuns the player.

export class BasiliskAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.IcosahedronGeometry(0.35 * radius, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00b894 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 384, model: mesh });

    this.radius = radius;
    // Create four zones in the arena quadrants
    const d = radius * 0.5;
    const positions = [
      new THREE.Vector3( d, 0,  d),
      new THREE.Vector3(-d, 0,  d),
      new THREE.Vector3( d, 0, -d),
      new THREE.Vector3(-d, 0, -d)
    ];
    this.zones = positions.map(p => ({ pos: p, timer: 0, cooldown: 0 }));
  }

  update(delta, playerObj, gameHelpers) {
    if (!this.alive || !playerObj) return;
    const hpPercent = Math.max(0, this.health / this.maxHealth);
    const maxSize = this.radius * 0.5;
    const size = Math.min(maxSize, (1 - hpPercent) / 0.7 * maxSize);

    this.zones.forEach(z => {
      const dx = playerObj.position.x - z.pos.x;
      const dz = playerObj.position.z - z.pos.z;
      const inside = Math.abs(dx) < size && Math.abs(dz) < size;

      if (inside && Date.now() > z.cooldown) {
        z.timer += delta;
        if (z.timer >= 1.5) {
          if (gameHelpers?.play) gameHelpers.play('stoneCrackingSound');
          gameHelpers?.addStatusEffect?.('Petrified', '🗿', 2000);
          playerObj.stunnedUntil = Date.now() + 2000;
          z.cooldown = Date.now() + 2000;
          z.timer = 0;
        }
      } else {
        z.timer = 0;
      }
    });
  }
}
