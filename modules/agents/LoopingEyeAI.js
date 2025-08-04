import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class LoopingEyeAI extends BaseAgent {
  constructor() {
    super({ color: 0xecf0f1 });

    const bossData = { id: "looper", name: "Looping Eye", maxHP: 320 };
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;
    
    this.lastTeleportTime = Date.now();
    this.isChargingTeleport = false;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    const hpPercent = this.health / this.maxHP;
    const interval = 1500 + (2500 * hpPercent); // Teleports faster at low health

    if (!this.isChargingTeleport && now - this.lastTeleportTime > interval) {
      this.isChargingTeleport = true;
      gameHelpers.play('chargeUpSound');

      const teleportTarget = new THREE.Vector3().randomDirection().multiplyScalar(ARENA_RADIUS);

      // Create a warning effect at the target location
      state.effects.push({
        type: 'teleport_indicator',
        position: teleportTarget,
        radius: this.r * 2, // World units
        endTime: now + 1000,
      });

      setTimeout(() => {
        if (!this.alive) return;
        this.position.copy(teleportTarget);
        gameHelpers.play('mirrorSwap');
        this.isChargingTeleport = false;
        this.lastTeleportTime = now + 1000;
      }, 1000);
    }
  }
}
