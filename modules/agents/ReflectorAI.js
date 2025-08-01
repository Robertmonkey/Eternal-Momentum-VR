import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { gameHelpers } from '../gameHelpers.js';
import * as CoreManager from '../CoreManager.js';

export class ReflectorAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const material = new THREE.MeshStandardMaterial({
        color: 0x2ecc71,
        emissive: 0x2ecc71,
        emissiveIntensity: 0.3,
    });
    const model = new THREE.Mesh(geometry, material);
    super({ model });
    
    const shieldGeo = new THREE.SphereGeometry(1.2, 32, 16);
    const shieldMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.add(this.shieldMesh);

    const bossData = { id: "reflector", name: "Reflector Warden", maxHP: 120 };
    Object.assign(this, bossData);

    this.phase = "idle";
    this.lastPhaseChange = Date.now();
    this.cycles = 0;
    this.reflecting = false;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    // Phase cycling
    if (now - this.lastPhaseChange > 2000) {
      this.phase = this.phase === "idle" ? "moving" : "idle";
      this.lastPhaseChange = now;
      if (this.phase === "moving") {
        this.cycles++;
        if (this.cycles % 3 === 0) {
          this.reflecting = true;
          setTimeout(() => { this.reflecting = false; }, 2000);
        }
      }
    }

    // Visuals
    this.shieldMesh.material.opacity = this.reflecting ? 0.75 : 0;
  }

  takeDamage(amount, sourceObject) {
    if (!this.alive) return;

    if (this.phase !== "idle") {
        this.health = Math.min(this.maxHP, this.health + amount);
    }
    
    if (this.reflecting) {
      gameHelpers.play('reflectorOnHit');
      if (sourceObject && typeof sourceObject.health === 'number') {
        const reflectedDamage = 10;
        sourceObject.health -= reflectedDamage;
        CoreManager.onPlayerDamage(reflectedDamage, this);
      }
    } else {
        // Only call BaseAgent's takeDamage if not reflecting
        super.takeDamage(amount, sourceObject);
    }
  }
}
