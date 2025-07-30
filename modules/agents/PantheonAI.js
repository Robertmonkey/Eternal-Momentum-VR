import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { moveTowards } from '../movement3d.js';
import { JuggernautAI } from './JuggernautAI.js';
import { AnnihilatorAI } from './AnnihilatorAI.js';
import { SyphonAI } from './SyphonAI.js';
import { CenturionAI } from './CenturionAI.js';
import { SwarmLinkAI } from './SwarmLinkAI.js';
import { BasiliskAI } from './BasiliskAI.js';
import { ArchitectAI } from './ArchitectAI.js';
import { GlitchAI } from './GlitchAI.js';
import { HelixWeaverAI } from './HelixWeaverAI.js';
import { EMPOverloadAI } from './EMPOverloadAI.js';
import { PuppeteerAI } from './PuppeteerAI.js';
import { VampireAI } from './VampireAI.js';
import { LoopingEyeAI } from './LoopingEyeAI.js';
import { MirrorMirageAI } from './MirrorMirageAI.js';

// PantheonAI - Implements boss B30: The Pantheon
// Cycles through aspects of other bosses, summoning temporary minions
// that use their abilities for a short duration.

export class PantheonAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.IcosahedronGeometry(0.45 * radius, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xecf0f1 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 1200, model: mesh });

    this.radius = radius;
    this.actionCooldown = 8000;
    this.nextActionTime = Date.now() + 3000;
    this.activeAspects = [];

    this.aspectPools = {
      primary: ['juggernaut', 'annihilator', 'syphon', 'centurion'],
      ambient: ['swarm', 'basilisk', 'architect', 'glitch'],
      projectile: ['helix_weaver', 'emp', 'puppeteer', 'vampire', 'looper', 'mirror'],
    };

    this.aspectMap = {
      juggernaut: JuggernautAI,
      annihilator: AnnihilatorAI,
      syphon: SyphonAI,
      centurion: CenturionAI,
      swarm: SwarmLinkAI,
      basilisk: BasiliskAI,
      architect: ArchitectAI,
      glitch: GlitchAI,
      helix_weaver: HelixWeaverAI,
      emp: EMPOverloadAI,
      puppeteer: PuppeteerAI,
      vampire: VampireAI,
      looper: LoopingEyeAI,
      mirror: MirrorMirageAI,
    };
  }

  spawnAspect(type, gameHelpers) {
    const pool = this.aspectPools[type];
    if (!pool) return;
    let id = pool[Math.floor(Math.random() * pool.length)];
    const used = this.activeAspects.map(a => a.id);
    let guard = 0;
    while (used.includes(id) && guard < 10) {
      id = pool[Math.floor(Math.random() * pool.length)];
      guard++;
    }
    if (used.includes(id)) return;
    const AspectClass = this.aspectMap[id];
    if (!AspectClass) return;
    const ai = new AspectClass(this.radius * 0.8);
    ai.position.copy(this.position);
    this.add(ai);
    this.activeAspects.push({ id, ai, type, endTime: Date.now() + (type === 'primary' ? 16000 : 15000) });
    gameHelpers?.play?.('pantheonSummon');
  }

  update(delta, playerObj, state, gameHelpers) {
    if (!this.alive) return;
    const now = Date.now();

    if (now > this.nextActionTime && this.activeAspects.length < 3) {
      const usedTypes = this.activeAspects.map(a => a.type);
      const pools = ['primary', 'ambient', 'projectile'].filter(p => !usedTypes.includes(p));
      const type = pools[Math.floor(Math.random() * pools.length)];
      this.spawnAspect(type, gameHelpers);
      this.nextActionTime = now + this.actionCooldown;
    }

    for (let i = this.activeAspects.length - 1; i >= 0; i--) {
      const a = this.activeAspects[i];
      if (now > a.endTime) {
        if (a.ai.parent) this.remove(a.ai);
        if (typeof a.ai.die === 'function') a.ai.die();
        this.activeAspects.splice(i, 1);
        continue;
      }
      if (typeof a.ai.update === 'function') {
        a.ai.update(delta, playerObj, state, gameHelpers);
      }
    }

    if (playerObj && playerObj.position) {
      moveTowards(this.position, playerObj.position, 0.5, this.radius);
    }
  }

  die() {
    this.activeAspects.forEach(a => {
      if (a.ai.parent) this.remove(a.ai);
      if (typeof a.ai.die === 'function') a.ai.die();
    });
    this.activeAspects = [];
    super.die();
  }
}
