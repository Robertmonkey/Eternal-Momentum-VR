import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class ShaperOfFateAI extends BaseAgent {
  constructor() {
    super({ color: 0xf1c40f });

    const bossData = { id: "shaper_of_fate", name: "The Shaper of Fate", maxHP: 600 };
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;
    
    this.phase = 'idle'; // idle -> prophecy -> fulfillment
    this.phaseTimer = Date.now() + 3000;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    if (this.phase === 'idle' && now > this.phaseTimer) {
      this.phase = 'prophecy';
      this.phaseTimer = now + 4000;
      gameHelpers.play('shaperAppear');
      
      const runeTypes = ['nova', 'shockwave', 'lasers', 'heal', 'speed_buff'];
      const shuffledRunes = runeTypes.sort(() => Math.random() - 0.5);

      for (let i = 0; i < 3; i++) {
          state.effects.push({
              type: 'shaper_rune',
              runeType: shuffledRunes[i],
              position: new THREE.Vector3().randomDirection().multiplyScalar(ARENA_RADIUS * 0.8),
              radius: 4,
              endTime: now + 4000
          });
      }

    } else if (this.phase === 'prophecy' && now > this.phaseTimer) {
      this.phase = 'fulfillment';
      this.phaseTimer = now + 3000;
      
      const runes = state.effects.filter(e => e.type === 'shaper_rune');
      if (runes.length > 0) {
        let closestRune = runes[0];
        let minPlayerDist = state.player.position.distanceTo(runes[0].position);
        runes.forEach(rune => {
            const dist = state.player.position.distanceTo(rune.position);
            if (dist < minPlayerDist) {
                minPlayerDist = dist;
                closestRune = rune;
            }
        });
        this.executeAttack(closestRune.runeType);
      }
      
      state.effects = state.effects.filter(e => e.type !== 'shaper_rune');

    } else if (this.phase === 'fulfillment' && now > this.phaseTimer) {
      this.phase = 'idle';
      this.phaseTimer = now + 5000;
    }
  }

  executeAttack(attackType) {
    gameHelpers.play('shaperAttune');
    switch (attackType) {
        case 'nova':
            state.effects.push({ type: 'nova_controller', caster: this, duration: 2500, damage: 25 });
            break;
        case 'shockwave':
            state.effects.push({ type: 'shockwave', caster: this, position: this.position.clone(), maxRadius: ARENA_RADIUS * 1.5, speed: 60, damage: 40 });
            break;
        case 'lasers':
            for(let i = 0; i < 5; i++) {
                setTimeout(() => {
                   if (this.alive) state.effects.push({ type: 'orbital_target', target: state.player, position: state.player.position.clone(), caster: this, damage: 45, radius: 5 });
                }, i * 400);
            }
            break;
        case 'heal':
            this.health = Math.min(this.maxHP, this.health + this.maxHP * 0.1);
            break;
        case 'speed_buff':
            // Implement a temporary speed boost for the boss
            break;
    }
  }
}
