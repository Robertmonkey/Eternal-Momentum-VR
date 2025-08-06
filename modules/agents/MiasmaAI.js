import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class MiasmaAI extends BaseAgent {
  constructor() {
    const bossData = { id: "miasma", name: "The Miasma", maxHP: 400 };
    super({ health: bossData.maxHP, color: 0x6ab04c, kind: bossData.id });

    this.name = bossData.name;
    this.isGasActive = false;
    this.lastGasAttack = 0;
    this.isChargingSlam = false;
    this.vents = [];

    // Create 4 vents at cardinal directions on the sphere's equator
    const ventPositions = [
        new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
    ];

    ventPositions.forEach(dir => {
        const vent = {
            position: dir.multiplyScalar(ARENA_RADIUS * 0.9),
            cooldownUntil: 0
        };
        this.vents.push(vent);
        state.effects.push({
            type: 'miasma_vent',
            ref: vent, // Link the effect to the AI's vent object
            endTime: Infinity
        });
    });
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    // Start gas attack
    if (!this.isGasActive && now - this.lastGasAttack > 10000) {
        this.isGasActive = true;
        gameHelpers.play('miasmaGasRelease');
        state.effects.push({ type: 'miasma_gas', endTime: Infinity, id: this.instanceId });
    }

    // Perform slam attack to purify
    if (this.isGasActive && !this.isChargingSlam) {
        this.isChargingSlam = true;
        gameHelpers.play('chargeUpSound');
        
        setTimeout(() => {
            if (!this.alive) return;
            gameHelpers.play('miasmaSlam');

            this.vents.forEach(vent => {
                if (now > vent.cooldownUntil && this.position.distanceTo(vent.position) < 10) {
                    vent.cooldownUntil = now + 10000;
                    this.isGasActive = false;
                    state.effects = state.effects.filter(e => !(e.type === 'miasma_gas' && e.id === this.instanceId));
                    this.lastGasAttack = now;
                    gameHelpers.play('ventPurify');
                }
            });
            this.isChargingSlam = false;
        }, 2000);
    }
  }

  takeDamage(amount, sourceObject) {
    // Immune to damage while gas is active
    if (this.isGasActive) return;
    super.takeDamage(amount, sourceObject);
  }

  die() {
      state.effects = state.effects.filter(e => e.type !== 'miasma_gas' && e.type !== 'miasma_vent');
      super.die();
  }
}
