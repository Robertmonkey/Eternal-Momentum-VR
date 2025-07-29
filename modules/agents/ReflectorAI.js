import { BaseAgent } from '../BaseAgent.js';

export class ReflectorAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.BoxGeometry(0.4 * radius, 0.4 * radius, 0.4 * radius);
    const mat = new THREE.MeshBasicMaterial({ color: 0x300030 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 40, model: mesh });

    const shieldGeom = new THREE.PlaneGeometry(0.6 * radius, 0.6 * radius);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x800080,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    this.shields = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(shieldGeom, shieldMat.clone());
      switch (i) {
        case 0:
          s.position.z = 0.35 * radius;
          break;
        case 1:
          s.position.z = -0.35 * radius;
          s.rotation.y = Math.PI;
          break;
        case 2:
          s.position.x = -0.35 * radius;
          s.rotation.y = Math.PI / 2;
          break;
        case 3:
          s.position.x = 0.35 * radius;
          s.rotation.y = -Math.PI / 2;
          break;
      }
      this.add(s);
      this.shields.push(s);
    }
    this.radius = radius;
    this.state = 'DEFENSIVE';
    this.timer = 0;
  }

  update(delta) {
    if (!this.alive) return;
    this.timer += delta;
    if (this.state === 'DEFENSIVE') {
      this.rotation.y += delta * 0.5;
      if (this.timer >= 8) {
        this.timer = 0;
        this.state = 'VULNERABLE';
        this.shields.forEach(s => s.material.opacity = 0.2);
      }
    } else if (this.state === 'VULNERABLE') {
      if (this.timer >= 4) {
        this.timer = 0;
        this.state = 'DEFENSIVE';
        this.shields.forEach(s => s.material.opacity = 0.5);
      }
    }
  }

  takeDamage(amount) {
    if (this.state === 'DEFENSIVE') return; // immune during defensive
    super.takeDamage(amount);
  }
}
