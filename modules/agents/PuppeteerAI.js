import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

export class PuppeteerAI extends BaseAgent {
  constructor() {
    const bossData = { id: "puppeteer", name: "The Puppeteer", maxHP: 320 };
    super({ health: bossData.maxHP, color: 0xa29bfe, kind: bossData.id });

    this.name = bossData.name;
    this.lastConvertTime = 0;
  }

  update(delta) {
    if (!this.alive) return;
    const now = Date.now();

    if (now - this.lastConvertTime > 4000) {
      this.lastConvertTime = now;
      let farthestEnemy = null;
      let maxDist = 0;

      state.enemies.forEach(e => {
        if (!e.boss && !e.isFriendly) {
          const dist = this.position.distanceTo(e.position);
          if (dist > maxDist) {
            maxDist = dist;
            farthestEnemy = e;
          }
        }
      });

      if (farthestEnemy) {
        gameHelpers.play('puppeteerConvert');
        farthestEnemy.isFriendly = true;
        
        // Enhance the puppet
        if (farthestEnemy.model) {
            farthestEnemy.model.material.color.set(0xa29bfe);
            farthestEnemy.model.material.emissive.set(0xa29bfe);
        }
        farthestEnemy.r *= 1.5;
        farthestEnemy.health = 100;
        farthestEnemy.maxHP = 100;
      }
    }
  }

  die() {
      // On death, all puppets are destroyed
      state.enemies.forEach(e => {
          if (e.isFriendly) e.hp = 0;
      });
      gameHelpers.play('magicDispelSound');
      super.die();
  }
}
