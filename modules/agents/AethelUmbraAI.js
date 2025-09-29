import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';

export class AethelUmbraAI extends BaseAgent {
  constructor(role, partner = null) {
    const isAethel = role === 'Aethel';
    const geometry = isAethel ? new THREE.DodecahedronGeometry(0.7) : new THREE.IcosahedronGeometry(0.9);
    const material = new THREE.MeshStandardMaterial({
        color: isAethel ? 0x3498db : 0xc0392b,
        emissive: isAethel ? 0x3498db : 0xc0392b,
        emissiveIntensity: 0.5
    });
    super({ model: new THREE.Mesh(geometry, material) });

    this.role = role;
    this.partner = partner;
    this.enraged = false;
    this.name = role;
    this.maxHP = isAethel ? 280 * 0.75 : 280 * 1.5;
    this.health = this.maxHP;
    this.maxHealth = this.maxHP;
    this.speed = isAethel ? 1.5 : 0.8;
    this.kind = 'aethel_and_umbra';
    this.bossId = 'aethel_and_umbra';
  }
  
  update(delta) {
    if (!this.alive) return;
    // Basic chase logic, can be replaced with navmesh later
    const playerPos = state.player.position;
    const direction = playerPos.clone().sub(this.position).normalize();
    this.position.add(direction.multiplyScalar(this.speed * delta * 0.2));
    this.position.normalize().multiplyScalar(50);
  }

  die() {
    super.die();
    if (this.partner && this.partner.alive && !this.partner.enraged) {
      this.partner.enrage();
    }
  }

  enrage() {
    this.enraged = true;
    this.speed *= 2;
    const newScale = this.model.scale.x * 1.25;
    this.model.scale.set(newScale, newScale, newScale);
    const healthBonus = this.maxHP * 0.5;
    this.maxHP += healthBonus;
    this.health += healthBonus;
    this.triggerAbilityAnimation(2, 1500);
  }
}
