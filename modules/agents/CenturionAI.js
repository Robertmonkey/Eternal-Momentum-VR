import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

export class CenturionAI extends BaseAgent {
  constructor() {
    const bossData = { id: "centurion", name: "The Centurion", maxHP: 480 };
    super({ health: bossData.maxHP, color: 0xd35400, kind: bossData.id });

    this.name = bossData.name;
    this.lastWallTime = 0;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    if (now - this.lastWallTime > 12000) {
      this.lastWallTime = now;
      gameHelpers.play('wallSummon');

      state.effects.push({
        type: 'shrinking_box',
        startTime: now,
        duration: 8000,
        center: state.player.position.clone(),
        initialSize: ARENA_RADIUS * 0.8, // World units
        gapSide: Math.floor(Math.random() * 4), // 0: +X, 1: -X, 2: +Z, 3: -Z
        gapPosition: Math.random() // 0.0 to 1.0 along the wall edge
      });
      gameHelpers.playLooping('wallShrink');
    }
  }

  die() {
      gameHelpers.stopLoopingSfx('wallShrink');
      state.effects = state.effects.filter(e => e.type !== 'shrinking_box');
      super.die();
  }
}
