import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';
import * as CoreManager from '../CoreManager.js';

const ARENA_RADIUS = 50;

export class AnnihilatorAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.CylinderGeometry(0.5, 1, 2, 8);
    const material = new THREE.MeshStandardMaterial({
        color: 0xd63031,
        emissive: 0xd63031,
        emissiveIntensity: 0.4
    });
    super({ model: new THREE.Mesh(geometry, material) });

    const bossData = { id: "annihilator", name: "The Annihilator", maxHP: 480 };
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;
    
    this.isChargingBeam = false;
    this.lastBeamTime = 0;

    // The central pillar is now a 3D object in the world state
    state.effects.push({
        type: 'annihilator_pillar',
        position: new THREE.Vector3(0, 0, 0),
        radius: 4, // World units
        endTime: Infinity // Permanent for the fight
    });
  }

  isPlayerInShadow() {
      const pillarEffect = state.effects.find(e => e.type === 'annihilator_pillar');
      if (!pillarEffect) return false;

      const bossPos = this.position;
      const playerPos = state.player.position;
      const pillarPos = pillarEffect.position;
      const pillarRadius = pillarEffect.radius;

      // Project vectors onto the XZ plane for a simple shadow check
      const bossV2 = new THREE.Vector2(bossPos.x, bossPos.z);
      const playerV2 = new THREE.Vector2(playerPos.x, playerPos.z);
      const pillarV2 = new THREE.Vector2(pillarPos.x, pillarPos.z);

      const line = new THREE.Line3(new THREE.Vector3(bossV2.x, 0, bossV2.y), new THREE.Vector3(playerV2.x, 0, playerV2.y));
      const sphere = new THREE.Sphere(new THREE.Vector3(pillarV2.x, 0, pillarV2.y), pillarRadius);
      
      return line.intersectsSphere(sphere);
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    if (!this.isChargingBeam && now - this.lastBeamTime > 12000) {
      this.isChargingBeam = true;
      gameHelpers.play('powerSirenSound');

      // 4-second charge up
      setTimeout(() => {
        if (!this.alive) return;

        gameHelpers.play('annihilatorBeamSound');
        
        // Add a visual effect for the beam
        state.effects.push({
            type: 'annihilator_beam_visual',
            source: this,
            endTime: Date.now() + 1200
        });

        if (!this.isPlayerInShadow()) {
            const damage = 1000; // Lethal damage
            state.player.health -= damage;
            CoreManager.onPlayerDamage(damage, this, gameHelpers);
        }

        this.isChargingBeam = false;
        this.lastBeamTime = now + 4000;
      }, 4000);
    }
  }

  die() {
      // Clean up the pillar when the boss is defeated
      state.effects = state.effects.filter(e => e.type !== 'annihilator_pillar');
      super.die();
  }
}
