import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

export class EpochEnderAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.SphereGeometry(0.8, 16, 16);
    const material = new THREE.MeshStandardMaterial({
        color: 0xbdc3c7,
        emissive: 0xbdc3c7,
        emissiveIntensity: 0.2,
        metalness: 0.9,
        roughness: 0.4
    });
    super({ model: new THREE.Mesh(geometry, material) });

    const bossData = { id: "epoch_ender", name: "The Epoch-Ender", maxHP: 550 };
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;
    
    this.damageInWindow = 0;
    this.lastStateSnapshot = { position: this.position.clone(), health: this.health };
    this.lastSnapshotTime = 0;
    this.rewindCooldownUntil = 0;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    // Create the dilation field behind the boss
    const toPlayer = state.player.position.clone().sub(this.position).normalize();
    const fieldDirection = toPlayer.negate();
    
    state.effects.push({
        type: 'dilation_field',
        source: this,
        position: this.position.clone(),
        direction: fieldDirection,
        radius: 15,
        endTime: now + 50
    });
    
    // Update the history snapshot every 2 seconds
    if (now - this.lastSnapshotTime > 2000) {
        this.lastSnapshotTime = now;
        this.lastStateSnapshot = { position: this.position.clone(), health: this.health };
    }
  }

  takeDamage(amount, sourceObject) {
    if (!this.alive) return;
    const now = Date.now();

    if (now > this.rewindCooldownUntil) {
      this.damageInWindow += amount;
      if (this.damageInWindow > 100) {
        gameHelpers.play('timeRewind');
        this.position.copy(this.lastStateSnapshot.position);
        this.health = this.lastStateSnapshot.health;
        this.rewindCooldownUntil = now + 15000; // 15-second cooldown on rewind
        this.damageInWindow = 0;
        return; // Don't take damage this frame
      }
    }
    
    super.takeDamage(amount, sourceObject);
  }
}
