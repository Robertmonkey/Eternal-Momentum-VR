import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { spherePosToUv } from '../utils.js';

// ReflectorAI - Boss B02: Reflector Warden
// Reimplementation of the original 2D behaviour. The boss cycles between
// idle and moving phases. Every third movement cycle enables a reflecting
// shield for 2 seconds which heals the boss when hit and damages the player.
export class ReflectorAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.BoxGeometry(0.4 * radius, 0.4 * radius, 0.4 * radius);
    const mat = new THREE.MeshBasicMaterial({ color: 0x300030 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 120, model: mesh });

    const shieldGeom = new THREE.RingGeometry(0.35 * radius, 0.4 * radius, 32);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x2ecc71,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    this.shield = new THREE.Mesh(shieldGeom, shieldMat);
    this.shield.rotation.x = Math.PI / 2;
    this.add(this.shield);

    this.radius = radius;
    this.phase = 'idle';
    this.last = Date.now();
    this.cycles = 0;
    this.reflecting = false;
  }

  update(delta, playerObj, gameState, gameHelpers) {
    if (!this.alive) return;
    const now = Date.now();
    if (now - this.last > 2000) {
      this.phase = this.phase === 'idle' ? 'moving' : 'idle';
      this.last = now;
      if (this.phase === 'moving') {
        this.cycles++;
        if (this.cycles % 3 === 0) {
          this.reflecting = true;
          if (gameHelpers?.spawnParticles) {
            const uv = spherePosToUv(this.position.clone().normalize(), this.radius);
            gameHelpers.spawnParticles(
              uv.u * 2048,
              uv.v * 1024,
              '#ffffff',
              50,
              4,
              30
            );
          }
          setTimeout(() => (this.reflecting = false), 2000);
        }
      }
    }

    this.shield.material.opacity = this.reflecting ? 0.6 : (this.phase === 'moving' ? 0.4 : 0.2);
  }

  takeDamage(amount, playerObj, gameState, gameHelpers) {
    if (!this.alive) return;
    if (this.phase !== 'idle') {
      this.health = Math.min(this.maxHealth, this.health + amount);
      if (this.reflecting && playerObj && typeof playerObj.health === 'number') {
        playerObj.health -= 10;
        if (playerObj.health <= 0 && gameState) gameState.gameOver = true;
        gameHelpers?.play?.('reflectorOnHit');
      }
    } else {
      super.takeDamage(amount);
    }
  }
}
