import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class BasiliskAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.CrystalGeometry(); // Placeholder for a custom crystal shape
    const material = new THREE.MeshStandardMaterial({
        color: 0x00b894,
        emissive: 0x00b894,
        emissiveIntensity: 0.3,
        roughness: 0.2,
        metalness: 0.8
    });
    // For now, use a simple shape
    const placeholderGeo = new THREE.IcosahedronGeometry(0.9, 1);
    super({ model: new THREE.Mesh(placeholderGeo, material) });

    const bossData = { id: "basilisk", name: "The Basilisk", maxHP: 384 };
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;
    
    this.zones = [];
    const zonePositions = [
        new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
    ];

    zonePositions.forEach(dir => {
        this.zones.push({
            position: dir.multiplyScalar(ARENA_RADIUS * 0.7),
            playerInsideTime: 0,
            cooldownUntil: 0,
        });
    });
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();
    const hpPercent = Math.max(0, this.health / this.maxHP);
    const growth = 1.0 - hpPercent;
    const zoneRadius = 5 + (15 * growth); // Zones grow from 5 to 20 world units

    this.zones.forEach(zone => {
        // Add a visual effect for the zone
        state.effects.push({
            type: 'basilisk_zone',
            position: zone.position,
            radius: zoneRadius,
            endTime: now + 50,
            onCooldown: now < zone.cooldownUntil
        });
        
        const playerPos = state.player.position;
        const distance = playerPos.distanceTo(zone.position);

        if (distance < zoneRadius && now > zone.cooldownUntil) {
            zone.playerInsideTime += delta;
            if (zone.playerInsideTime > 1.5) { // 1.5 seconds to petrify
                gameHelpers.play('stoneCrackingSound');
                gameHelpers.addStatusEffect('Petrified', '🗿', 2000);
                zone.playerInsideTime = 0;
                zone.cooldownUntil = now + 4000; // 4 second cooldown after petrifying
            }
        } else {
            zone.playerInsideTime = 0;
        }
    });
  }
}
