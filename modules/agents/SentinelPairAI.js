import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';
import * as CoreManager from '../CoreManager.js';

const ARENA_RADIUS = 50;

export class SentinelPairAI extends BaseAgent {
  constructor(partner = null) {
    const geometry = new THREE.OctahedronGeometry(0.7, 0);
    const material = new THREE.MeshStandardMaterial({
        color: 0xf1c40f,
        emissive: 0xf1c40f,
        emissiveIntensity: 0.6
    });
    super({ model: new THREE.Mesh(geometry, material) });
    
    const bossData = { id: "sentinel_pair", name: "Sentinel Pair", maxHP: 400 };
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;

    this.partner = partner;
    if (this.partner) {
        this.partner.partner = this; // Link back
    }
  }

  update(delta) {
    if (!this.alive || !this.partner || !this.partner.alive) return;
    const playerPos = state.player.position;

    // AI to position the pair around the player
    const toPlayer = playerPos.clone().sub(this.position).normalize();
    const desiredSeparation = 15; // World units

    // A vector perpendicular to both the "up" vector and the vector to the player
    const perpendicular = new THREE.Vector3().crossVectors(this.position, toPlayer).normalize();
    
    const targetPosA = playerPos.clone().add(perpendicular.clone().multiplyScalar(desiredSeparation / 2));
    const targetPosB = playerPos.clone().sub(perpendicular.clone().multiplyScalar(desiredSeparation / 2));

    targetPosA.normalize().multiplyScalar(ARENA_RADIUS);
    targetPosB.normalize().multiplyScalar(ARENA_RADIUS);

    // This sentinel moves towards A, partner moves towards B
    this.position.lerp(targetPosA, 0.5 * delta);
    this.partner.position.lerp(targetPosB, 0.5 * delta);
    
    // Add beam effect for rendering
    state.effects.push({
        type: 'sentinel_beam',
        start: this.position.clone(),
        end: this.partner.position.clone(),
        endTime: Date.now() + 50 // Effect lasts for a very short time
    });

    // Damage player if they intersect the beam
    const playerLineDist = new THREE.Line3(this.position, this.partner.position).closestPointToPoint(playerPos, true, new THREE.Vector3()).distanceTo(playerPos);
    if(playerLineDist < state.player.r + 0.2) {
        if (!state.player.shield) {
            const damage = 1;
            state.player.health -= damage;
            CoreManager.onPlayerDamage(damage, this, gameHelpers);
        }
    }
  }

  takeDamage(amount, sourceObject) {
    if (!this.alive) return;
    // Damage is shared
    super.takeDamage(amount, sourceObject);
    if (this.partner) {
        this.partner.health = this.health;
    }
  }

  die() {
    super.die();
    if (this.partner && this.partner.alive) {
        this.partner.die();
    }
  }
}
