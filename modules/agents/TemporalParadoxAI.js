import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

export class TemporalParadoxAI extends BaseAgent {
  constructor() {
    const geometry = new THREE.TorusGeometry(0.8, 0.1, 8, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0x81ecec,
        emissive: 0x81ecec,
        emissiveIntensity: 0.7
    });
    const model = new THREE.Mesh(geometry, material);
    model.add(new THREE.Mesh(geometry.clone().rotateX(Math.PI / 2)));
    super({ model });

    const bossData = { id: "temporal_paradox", name: "The Temporal Paradox", maxHP: 420 };
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;

    this.playerHistory = [];
    this.lastEchoTime = 0;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    // Record player's 3D position
    this.playerHistory.push({ pos: state.player.position.clone(), time: now });
    this.playerHistory = this.playerHistory.filter(p => now - p.time < 5000);

    if (now - this.lastEchoTime > 8000) {
      this.lastEchoTime = now;
      gameHelpers.play('phaseShiftSound');
      
      const historyToReplay = this.playerHistory.map(p => p.pos);
      
      state.effects.push({
        type: 'paradox_echo',
        path: historyToReplay,
        startTime: now,
        duration: 5000, // Echo replays the 5-second history over 5 seconds
        playerRadius: state.player.r
      });
      gameHelpers.playLooping('paradoxTrailHum');
    }
  }

  die() {
      gameHelpers.stopLoopingSfx('paradoxTrailHum');
      gameHelpers.play('paradoxShatter');
      state.effects = state.effects.filter(e => e.type !== 'paradox_echo');
      super.die();
  }
}
