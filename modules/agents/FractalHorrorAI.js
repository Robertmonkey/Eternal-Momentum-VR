import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';
import { getScene } from '../scene.js';

const ARENA_RADIUS = 50;

export class FractalHorrorAI extends BaseAgent {
  constructor(generation = 1) {
    const size = 1.2 / generation;
    const bossData = { id: "fractal_horror", name: "The Fractal Horror", maxHP: 10000 };
    super({ health: bossData.maxHP / generation, color: 0xbe2edd, kind: bossData.id, radius: size });

    if (generation === 1) {
        this.name = bossData.name;
        state.fractalHorrorSharedHp = this.maxHP;
    }
    
    this.generation = generation;
  }

  update(delta) {
    if (!this.alive) return;
    this.health = state.fractalHorrorSharedHp; // Sync with shared pool

    // Split if enough damage has been dealt and generation is not too high
    const hpPercent = state.fractalHorrorSharedHp / this.maxHP;
    const expectedSplits = Math.floor((1 - hpPercent) * 20); // Split roughly every 5%

    if (state.enemies.filter(e => e.kind === 'fractal_horror').length < expectedSplits && this.generation < 5) {
        this.split();
    }
  }

  split() {
    if (!this.alive) return;
    gameHelpers.play('fractalSplit');
    const parent = this.parent || getScene();
    const spawnRadius = this.position.length() || ARENA_RADIUS;
    const scaleFactor = this.scale?.x || 1;
    for (let i = 0; i < 2; i++) {
        const child = new FractalHorrorAI(this.generation + 1);
        child.boss = true;
        child.bossIndex = this.bossIndex;
        child.bossId = this.bossId || 'fractal_horror';
        child.kind = 'fractal_horror';
        const offset = new THREE.Vector3().randomDirection().multiplyScalar(this.r * 2);
        const targetPos = this.position.clone().add(offset).normalize().multiplyScalar(spawnRadius);
        child.position.copy(targetPos);
        child.scale.multiplyScalar(scaleFactor);
        child.r = (child.r || 1) * scaleFactor;
        state.enemies.push(child);
        parent?.add(child);
    }
    this.die(false); // Die without triggering on-death effects
  }

  takeDamage(amount, sourceObject) {
      if (!this.alive) return;
      state.fractalHorrorSharedHp -= amount;
      // All instances die when shared health is gone
      if (state.fractalHorrorSharedHp <= 0) {
          state.enemies.forEach(e => {
              if (e.kind === 'fractal_horror') e.hp = 0;
          });
      }
  }

  die(isFinal = true) {
      // Remove this instance from the game
      const index = state.enemies.indexOf(this);
      if (index > -1) state.enemies.splice(index, 1);
      this.alive = false;
      this.model.visible = false;
      if (this.parent) this.parent.remove(this);

      // If this is the very last fragment, trigger the actual boss death
      if (isFinal && state.enemies.filter(e => e.kind === 'fractal_horror').length === 0) {
          super.die();
      }
  }
}
