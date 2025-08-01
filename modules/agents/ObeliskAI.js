import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

// The Conduit minions need to be defined as their own class
export class ObeliskConduitAI extends BaseAgent {
    constructor(parentObelisk, conduitType, color, initialAngle) {
        const geometry = new THREE.IcosahedronGeometry(0.6, 1);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.7
        });
        super({ model: new THREE.Mesh(geometry, material) });

        this.maxHP = 250;
        this.health = this.maxHP;
        this.parentObelisk = parentObelisk;
        this.conduitType = conduitType;
        this.orbitalAngle = initialAngle;
        this.lastAbilityTime = Date.now();
    }

    update(delta) {
        if (!this.alive || !this.parentObelisk.alive) {
            this.die();
            return;
        }
        
        // Orbit the parent Obelisk
        const now = Date.now();
        const rotation = now * 0.0003;
        const orbitDistance = 20;
        const oscillation = Math.sin(now * 0.0008) * 5;
        
        this.position.set(
            Math.cos(this.orbitalAngle + rotation) * (orbitDistance + oscillation),
            Math.sin(now * 0.0005) * 5, // Bob up and down
            Math.sin(this.orbitalAngle + rotation) * (orbitDistance + oscillation)
        );

        // Use abilities
        switch (this.conduitType) {
            case 'gravity':
                if (now - this.lastAbilityTime > 4000) {
                    this.lastAbilityTime = now;
                    state.effects.push({ type: 'gravity_well', position: this.position.clone(), radius: 10, endTime: now + 3000 });
                }
                break;
            case 'explosion':
                if (now - this.lastAbilityTime > 5000) {
                    this.lastAbilityTime = now;
                    state.effects.push({ type: 'shockwave', caster: this, position: this.position.clone(), maxRadius: 12, speed: 30, damage: 25 });
                }
                break;
        }
    }

    die() {
        super.die();
        gameHelpers.play('conduitShatter');
        // Check if this was the last conduit
        const remaining = state.enemies.filter(e => e instanceof ObeliskConduitAI && e.alive);
        if (remaining.length === 0 && this.parentObelisk) {
            this.parentObelisk.invulnerable = false;
        }
    }
}


export class ObeliskAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.CylinderGeometry(1, 0.2, 4, 6);
    const material = new THREE.MeshStandardMaterial({
        color: 0x2c3e50,
        emissive: 0x2c3e50,
        emissiveIntensity: 0.1,
        metalness: 0.9,
        roughness: 0.3
    });
    super({ model: new THREE.Mesh(geometry, material) });

    const bossData = { id: "obelisk", name: "The Obelisk", maxHP: 800 };
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;

    this.position.set(0, 0, 0);
    this.invulnerable = true;
    this.beamAngle = 0;
  }

  update(delta) {
    if (!this.alive) return;

    if (this.invulnerable) {
        // Hum while invulnerable
        gameHelpers.playLooping('obeliskHum');
    } else {
        // Attack when vulnerable
        gameHelpers.stopLoopingSfx('obeliskHum');
        this.beamAngle += 0.005; // Slowly rotate the beam
        const beamLength = ARENA_RADIUS * 2;
        const beamEnd = new THREE.Vector3(
            Math.cos(this.beamAngle) * beamLength,
            0,
            Math.sin(this.beamAngle) * beamLength
        );
        state.effects.push({
            type: 'sentinel_beam', // Re-use the sentinel beam visual/logic
            start: this.position.clone(),
            end: beamEnd,
            endTime: Date.now() + 50
        });
    }
  }

  takeDamage(amount, sourceObject) {
    if (this.invulnerable) return;
    super.takeDamage(amount, sourceObject);
  }
}
