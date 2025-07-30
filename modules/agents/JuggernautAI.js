import * as THREE from "../../vendor/three.module.js";
import { BaseAgent } from '../BaseAgent.js';
import { moveTowards } from '../movement3d.js';

// JuggernautAI - Implements boss B11: The Juggernaut
// Aggressive boss that periodically charges at the player.

export class JuggernautAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.SphereGeometry(0.35 * radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x636e72 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 360, model: mesh });

    this.radius = radius;
    this.state = 'ROAMING';
    this.timer = 0;
    this.target = this.randomPos();
  }

  randomPos() {
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.random() * Math.PI;
    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * this.radius,
      Math.cos(phi) * this.radius,
      Math.sin(phi) * Math.sin(theta) * this.radius
    );
  }

  update(delta, playerObj, gameHelpers) {
    if (!this.alive) return;
    this.timer += delta;

    if (this.state === 'ROAMING') {
      moveTowards(this.position, this.target, 0.8, this.radius);
      if (this.position.distanceTo(this.target) < 0.05 * this.radius) {
        this.target = this.randomPos();
      }
      if (this.timer >= 7) {
        this.state = 'CHARGE_UP';
        this.timer = 0;
        if (gameHelpers && typeof gameHelpers.play === 'function') {
          gameHelpers.play('chargeUpSound');
        }
      }
    } else if (this.state === 'CHARGE_UP') {
      if (this.timer >= 1) {
        this.state = 'CHARGING';
        this.timer = 0;
        this.target = playerObj && playerObj.position
          ? playerObj.position.clone()
          : this.randomPos();
        if (gameHelpers && typeof gameHelpers.play === 'function') {
          gameHelpers.play('chargeDashSound');
        }
      }
    } else if (this.state === 'CHARGING') {
      moveTowards(this.position, this.target, 6, this.radius);
      if (this.timer >= 2) {
        this.state = 'ROAMING';
        this.timer = 0;
        this.target = this.randomPos();
      }
    }
  }
}
