import { BaseAgent } from '../BaseAgent.js';

// AnnihilatorAI - Implements boss B16: The Annihilator
// Periodically charges and fires a devastating beam. The player must
// hide behind a central pillar to avoid lethal damage.

export class AnnihilatorAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.CylinderGeometry(0.3 * radius, 0.3 * radius, 0.6 * radius, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xd63031 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 480, model: mesh });

    this.radius = radius;
    this.state = 'IDLE';
    this.timer = 0;
    this.pillar = { pos: new THREE.Vector3(0, 0, 0), r: 0.4 * radius };
  }

  inShadow(playerPos) {
    const a = this.position;
    const o = this.pillar.pos;
    const p = playerPos;
    const AO = o.clone().sub(a);
    const AP = p.clone().sub(a);
    const distAO = AO.length();
    const angle = Math.asin(this.pillar.r / distAO);
    return AP.length() > distAO && AO.angleTo(AP) < angle;
  }

  update(delta, playerObj, gameHelpers) {
    if (!this.alive || !playerObj) return;
    this.timer += delta;

    if (this.state === 'IDLE' && this.timer > 12) {
      this.state = 'CHARGING';
      this.timer = 0;
      gameHelpers?.play?.('powerSirenSound');
    } else if (this.state === 'CHARGING' && this.timer > 4) {
      this.state = 'IDLE';
      this.timer = 0;
      gameHelpers?.play?.('annihilatorBeamSound');
      if (!this.inShadow(playerObj.position)) {
        if (typeof playerObj.health === 'number') {
          playerObj.health -= 1000;
          if (playerObj.health <= 0) playerObj.alive = false;
        }
      }
    }
  }
}
