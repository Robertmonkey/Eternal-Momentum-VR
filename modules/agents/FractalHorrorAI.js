import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import { gameHelpers } from '../gameHelpers.js';

export class FractalHorrorAI extends BaseAgent {
  constructor(generation = 1) {
    const size = 1.2 / generation;
    super({ color: 0xbe2edd });
    
    if (generation === 1) {
        const bossData = { id: "fractal_horror", name: "The Fractal Horror", maxHP: 10000 };
        this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;
        state.fractalHorrorSharedHp = this.maxHP;
    } else {
        this.maxHP = 10000 / generation;
        this.health = this.maxHP;
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
    for (let i = 0; i < 2; i++) {
        const child = new FractalHorrorAI(this.generation + 1);
        const offset = new THREE.Vector3().randomDirection().multiplyScalar(this.r * 2);
        child.position.copy(this.position).add(offset);
        state.enemies.push(child);
        // In a real scene graph, you would add child to the scene:
        // this.parent.add(child);
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

      // If this is the very last fragment, trigger the actual boss death
      if (isFinal && state.enemies.filter(e => e.kind === 'fractal_horror').length === 0) {
          super.die();
      }
  }
}
