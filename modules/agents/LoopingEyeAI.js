import { BaseAgent } from '../BaseAgent.js';

// LoopingEyeAI - Implements boss B10: Looping Eye
// Records the player's movement and then replays a damaging trail.

export class LoopingEyeAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.SphereGeometry(0.35 * radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 320, model: mesh });

    this.radius = radius;
    this.state = 'RECORDING';
    this.timer = 0;
    this.path = [];
  }

  update(delta, playerObj, gameHelpers, drawTrail) {
    if (!this.alive) return;
    this.timer += delta;

    if (this.state === 'RECORDING') {
      if (playerObj && playerObj.position) {
        this.path.push(playerObj.position.clone());
        if (this.path.length > 300) this.path.shift();
      }
      if (this.timer >= 5) {
        this.state = 'REPLAY';
        this.timer = 0;
        if (gameHelpers && typeof gameHelpers.play === 'function') {
          gameHelpers.play('timeRewind');
        }
      }
    } else if (this.state === 'REPLAY') {
      if (drawTrail) {
        for (let i = 1; i < this.path.length; i++) {
          drawTrail(this.path[i - 1], this.path[i]);
        }
      }
      if (this.timer >= 5) {
        this.path = [];
        this.state = 'RECORDING';
        this.timer = 0;
      }
    }
  }
}
