import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class QuantumShadowAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.SphereGeometry(0.7, 32, 16);
    const material = new THREE.MeshStandardMaterial({
        color: 0x81ecec,
        emissive: 0x81ecec,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 1.0
    });
    super({ model: new THREE.Mesh(geometry, material) });

    const bossData = { id: "quantum_shadow", name: "Quantum Shadow", maxHP: 360 };
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;
    
    this.phase = 'seeking'; // 'seeking' or 'superposition'
    this.lastPhaseChangeTime = Date.now();
    this.invulnerable = false;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    if (this.phase === 'seeking' && now - this.lastPhaseChangeTime > 7000) {
      this.phase = 'superposition';
      this.lastPhaseChangeTime = now;
      this.invulnerable = true;
      this.model.material.opacity = 0.3;
      gameHelpers.play('phaseShiftSound');
      
      const echoCount = 3 + Math.floor((1 - this.health / this.maxHP) * 5);
      for(let i = 0; i < echoCount; i++) {
          state.effects.push({
              type: 'quantum_echo',
              position: new THREE.Vector3().randomDirection().multiplyScalar(ARENA_RADIUS),
              radius: this.r,
              endTime: now + 3000
          });
      }

    } else if (this.phase === 'superposition' && now - this.lastPhaseChangeTime > 3000) {
      this.phase = 'seeking';
      this.lastPhaseChangeTime = now;
      this.invulnerable = false;
      this.model.material.opacity = 1.0;

      const echoes = state.effects.filter(e => e.type === 'quantum_echo');
      const targetEcho = echoes[Math.floor(Math.random() * echoes.length)];
      
      if(targetEcho) {
          this.position.copy(targetEcho.position);
      }
      
      // Detonate the other echoes
      echoes.forEach(echo => {
          if (echo !== targetEcho) {
              state.effects.push({ type: 'shockwave', caster: this, position: echo.position, maxRadius: 10, speed: 50, damage: 10 });
          }
      });
      // Clear all echoes
      state.effects = state.effects.filter(e => e.type !== 'quantum_echo');
    }
  }

  takeDamage(amount, sourceObject) {
    if (this.invulnerable) return;
    super.takeDamage(amount, sourceObject);
  }
}
