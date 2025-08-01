import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

export class HelixWeaverAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.TorusGeometry(0.8, 0.2, 16, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0xe74c3c,
        emissive: 0xe74c3c,
        emissiveIntensity: 0.6
    });
    const model = new THREE.Mesh(geometry, material);
    model.add(new THREE.Mesh(geometry.clone().rotateX(Math.PI / 2)));
    super({ model });

    const bossData = { id: "helix_weaver", name: "The Helix Weaver", maxHP: 500 };
    Object.assign(this, bossData);

    this.position.set(0, 0, 0); // Stays at the center
    this.angle = 0;
    this.lastShotTime = 0;
    this.activeArms = 1;
    this.lastArmIncrease = 4;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    if (now - this.lastShotTime > 100) {
      this.lastShotTime = now;
      const speed = 0.5; // World units per frame
      const totalArms = 4;
      
      for (let i = 0; i < this.activeArms; i++) {
        const angle = this.angle + (i * (2 * Math.PI / totalArms));
        const velocity = new THREE.Vector3(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
        
        state.effects.push({ 
            type: 'nova_bullet', 
            caster: this, 
            position: this.position.clone(), 
            velocity: velocity,
            radius: 0.2,
            color: new THREE.Color(0xe74c3c),
            damage: 13
        });
      }
      this.angle += 0.2;
    }
  }

  takeDamage(amount, sourceObject) {
    super.takeDamage(amount, sourceObject);
    const hpPercent = this.health / this.maxHP;
    let armsToActivate = 1;
    if (hpPercent < 0.8) armsToActivate = 2;
    if (hpPercent < 0.6) armsToActivate = 3;
    if (hpPercent < 0.4) armsToActivate = 4;

    if (armsToActivate > this.activeArms) {
        this.activeArms = armsToActivate;
        gameHelpers.play('weaverCast');
    }
  }
}
