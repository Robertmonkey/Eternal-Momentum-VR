import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { moveTowards } from '../movement3d.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class JuggernautAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.CapsuleGeometry(0.8, 1.0, 4, 8);
    const material = new THREE.MeshStandardMaterial({
        color: 0x636e72,
        emissive: 0x636e72,
        emissiveIntensity: 0.2,
        metalness: 0.8,
        roughness: 0.3
    });
    super({ model: new THREE.Mesh(geometry, material) });

    const bossData = { id: "juggernaut", name: "The Juggernaut", maxHP: 360 };
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;
    
    this.isCharging = false;
    this.chargeEndTime = 0;
    this.lastChargeTime = 0;
    this.chargeTarget = new THREE.Vector3();
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();
    const speedMultiplier = 1 + (1 - this.health / this.maxHP) * 2.5;

    if (this.isCharging) {
        if (now > this.chargeEndTime) {
            this.isCharging = false;
            this.lastChargeTime = now;
        } else {
            // Move quickly towards the charge target
            moveTowards(this.position, this.chargeTarget, 15 * speedMultiplier * delta, ARENA_RADIUS);
            // If we reach the target, pick a new random one to simulate a bounce
            if (this.position.distanceTo(this.chargeTarget) < 2) {
                this.chargeTarget.randomDirection().multiplyScalar(ARENA_RADIUS);
            }
        }
    } else {
        // Normal movement
        const playerPos = state.player.position;
        moveTowards(this.position, playerPos, 0.8 * speedMultiplier * delta, ARENA_RADIUS);

        // Check if it's time to charge
        if (now - this.lastChargeTime > 7000) {
            this.isCharging = true;
            this.chargeEndTime = now + 3000; // Charge for 3 seconds
            this.chargeTarget.copy(playerPos);
            gameHelpers.play('chargeUpSound');
            state.effects.push({
                type: 'charge_indicator',
                source: this,
                startTime: now,
                duration: 1000,
                radius: 3
            });
            setTimeout(() => {
                if(this.alive) gameHelpers.play('chargeDashSound');
            }, 1000);
        }
    }
  }
}
