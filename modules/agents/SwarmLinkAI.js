import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import * as CoreManager from '../CoreManager.js';

export class SwarmLinkAI extends BaseAgent {
  constructor() {
    const headGeo = new THREE.IcosahedronGeometry(0.8, 0);
    const headMat = new THREE.MeshStandardMaterial({
        color: 0xc0392b,
        emissive: 0xc0392b,
        emissiveIntensity: 0.5
    });
    super({ model: new THREE.Mesh(headGeo, headMat) });
    
    const bossData = { id: "swarm", name: "Swarm Link", maxHP: 200 };
    Object.assign(this, bossData);

    this.tailSegments = [];
    this.tailGroup = new THREE.Group();
    this.add(this.tailGroup);

    const segmentGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const segmentMat = new THREE.MeshStandardMaterial({ color: 0xf39c12 });

    for (let i = 0; i < 25; i++) {
      const segmentMesh = new THREE.Mesh(segmentGeo, segmentMat);
      this.tailGroup.add(segmentMesh);
      this.tailSegments.push({
          mesh: segmentMesh,
          position: this.position.clone()
      });
    }
  }

  update(delta) {
    if (!this.alive) return;

    let leadSegmentPos = this.position;
    this.tailSegments.forEach(seg => {
      // Each segment smoothly follows the one in front of it
      seg.position.lerp(leadSegmentPos, 0.2);
      seg.mesh.position.copy(seg.position);
      leadSegmentPos = seg.position;

      // Damage player on contact
      const playerPos = state.player.position;
      const distance = playerPos.distanceTo(seg.position);
      if (distance < state.player.r + 0.4) { // 0.4 is segment radius
        if (!state.player.shield) {
            const damage = 0.5; // Damage per frame
            state.player.health -= damage;
            CoreManager.onPlayerDamage(damage, this);
        }
      }
    });
  }
}
