import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { getSphericalDirection } from '../movement3d.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class JuggernautAI extends BaseAgent {
  constructor() {
    const bossData = { id: "juggernaut", name: "The Juggernaut", maxHP: 360 };
    super({ health: bossData.maxHP, color: 0x636e72, kind: bossData.id });

    this.name = bossData.name;
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
            // Move quickly towards the charge target along the sphere
            const dir = getSphericalDirection(this.position, this.chargeTarget);
            const dist = this.position.distanceTo(this.chargeTarget);
            this.position.add(dir.multiplyScalar(dist * 0.015 * 15 * speedMultiplier * delta));
            this.position.normalize().multiplyScalar(ARENA_RADIUS);
            this.lookAt(this.position.clone().add(dir));
            // If we reach the target, pick a new random one to simulate a bounce
            if (this.position.distanceTo(this.chargeTarget) < 2) {
                this.chargeTarget.randomDirection().multiplyScalar(ARENA_RADIUS);
            }
        }
    } else {
        // Normal movement toward the player
        const playerPos = state.player.position;
        const dir = getSphericalDirection(this.position, playerPos);
        const dist = this.position.distanceTo(playerPos);
        this.position.add(dir.multiplyScalar(dist * 0.015 * 0.8 * speedMultiplier * delta));
        this.position.normalize().multiplyScalar(ARENA_RADIUS);
        this.lookAt(this.position.clone().add(dir));

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
