import { BaseAgent } from '../BaseAgent.js';

// EMPOverloadAI - Implements boss B7: EMP Overload
// This boss periodically charges up and unleashes an EMP burst that clears
// the player's power-ups and briefly stuns them. Visual lightning bolts are
// spawned to indicate the discharge.

export class EMPOverloadAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.TorusGeometry(0.3 * radius, 0.1 * radius, 16, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00BFFF });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 260, model: mesh });

    this.radius = radius;
    this.state = 'NORMAL';
    this.timer = 0;
    this.bolts = [];
  }

  /**
   * Trigger the EMP discharge. Resets player inventories and spawns
   * a burst of lightning bolt visuals.
   * @param {object} gameHelpers - Utility callbacks (play, addStatusEffect).
   * @param {object} state      - Global game state for inventory access.
   * @param {number} width      - Canvas width for bolt coordinates.
   * @param {number} height     - Canvas height for bolt coordinates.
   */
  discharge(gameHelpers, state, width, height) {
    this.timer = 0;
    this.state = 'NORMAL';
    if (gameHelpers && typeof gameHelpers.play === 'function') {
      gameHelpers.play('empDischarge');
    }
    if (state) {
      state.offensiveInventory = [null, null, null];
      state.defensiveInventory = [null, null, null];
    }
    if (gameHelpers && typeof gameHelpers.addStatusEffect === 'function') {
      gameHelpers.addStatusEffect('Slowed', '🐌', 1000);
      gameHelpers.addStatusEffect('Stunned', '😵', 500);
    }
    this.bolts.length = 0;
    for (let i = 0; i < 7; i++) {
      this.bolts.push({
        x1: Math.random() * width,
        y1: 0,
        x2: Math.random() * width,
        y2: height,
        life: 0.3
      });
      this.bolts.push({
        x1: 0,
        y1: Math.random() * height,
        x2: width,
        y2: Math.random() * height,
        life: 0.3
      });
    }
  }

  update(delta, width, height, gameHelpers, state, drawLightning) {
    if (!this.alive) return;

    this.timer += delta;
    if (this.state === 'NORMAL' && this.timer > 10) {
      this.state = 'CHARGING';
      this.timer = 0;
      if (gameHelpers && typeof gameHelpers.play === 'function') {
        gameHelpers.play('powerSirenSound');
      }
    } else if (this.state === 'CHARGING' && this.timer > 3) {
      this.discharge(gameHelpers, state, width, height);
    }

    // Update lightning bolt lifetimes
    this.bolts = this.bolts.filter(b => {
      b.life -= delta;
      if (b.life > 0 && typeof drawLightning === 'function') {
        drawLightning(b.x1, b.y1, b.x2, b.y2, '#00BFFF');
      }
      return b.life > 0;
    });
  }
}
