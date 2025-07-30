import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { spherePosToUv } from '../utils.js';
import { spawnEnemy } from '../gameLoop.js';

// SplitterAI - Boss B01: Splitter Sentinel
// Reimplemented directly from the original 2D logic. The boss has no
// active behavior and simply shatters into two waves of minions on death.
export class SplitterAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.SphereGeometry(0.3 * radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 96, model: mesh });
    this.radius = radius;
  }

  update() {
    // Splitter has no unique per-frame logic in the original game.
  }

  die(gameHelpers, state) {
    super.die();
    if (gameHelpers?.play) gameHelpers.play('splitterOnDeath');
    if (gameHelpers?.spawnParticles) {
      const uv = spherePosToUv(this.position.clone().normalize(), this.radius);
      gameHelpers.spawnParticles(
        uv.u * 2048,
        uv.v * 1024,
        '#ff4500',
        100,
        6,
        40,
        5
      );
    }
    const centerUv = spherePosToUv(this.position.clone().normalize(), this.radius);
    const center = { x: centerUv.u * 2048, y: centerUv.v * 1024 };
    const spawnWave = radiusPx => {
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * 2 * Math.PI + Math.random() * 0.5;
        const x = center.x + Math.cos(ang) * radiusPx;
        const y = center.y + Math.sin(ang) * radiusPx;
        spawnEnemy(false, null, { x, y });
      }
    };
    spawnWave(60);
    setTimeout(() => spawnWave(120), 1000);
  }
}
