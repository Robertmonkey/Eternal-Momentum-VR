import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { state } from '../state.js';
import * as CoreManager from '../CoreManager.js';
import { applyPlayerDamage } from '../helpers.js';
import { gameHelpers } from '../gameHelpers.js';

const ARENA_RADIUS = 50;

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
    this.kind = bossData.id;
    this.name = bossData.name;
    this.maxHP = bossData.maxHP;
    this.health = this.maxHP;

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

    // Use spherical interpolation so segments follow the surface
    let leadDir = this.position.clone().normalize();
    const playerPos = state.player.position;

    this.tailSegments.forEach(seg => {
      const currentDir = seg.position.clone().normalize();
      const axis = currentDir.clone().cross(leadDir);
      if (axis.lengthSq() > 0) {
        const angle = currentDir.angleTo(leadDir) * 0.2;
        const quat = new THREE.Quaternion().setFromAxisAngle(axis.normalize(), angle);
        currentDir.applyQuaternion(quat);
      }
      seg.position.copy(currentDir.multiplyScalar(ARENA_RADIUS));
      seg.mesh.position.copy(seg.position.clone().sub(this.position));
      leadDir = seg.position.clone().normalize();

      const distance = playerPos.distanceTo(seg.position);
      if (distance < state.player.r + 0.4) {
        applyPlayerDamage(0.5, this, gameHelpers);
      }
    });
  }
}
