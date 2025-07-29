import { BaseAgent } from '../BaseAgent.js';

export class ReflectorAI extends BaseAgent {
  constructor(radius = 1) {
    const geom = new THREE.BoxGeometry(0.4 * radius, 0.4 * radius, 0.4 * radius);
    const mat = new THREE.MeshBasicMaterial({ color: 0x300030 });
    const mesh = new THREE.Mesh(geom, mat);
    super({ health: 120, model: mesh });

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
    this.phase = 'idle';
    this.last = Date.now();
    this.cycles = 0;
    this.reflecting = false;
  }

  update(delta) {
    if (!this.alive) return;
    if (Date.now() - this.last > 2000) {
      this.phase = this.phase === 'idle' ? 'moving' : 'idle';
      this.last = Date.now();
      if (this.phase === 'moving') {
        this.cycles++;
        if (this.cycles % 3 === 0) {
          this.reflecting = true;
          setTimeout(() => (this.reflecting = false), 2000);
        }
      }
    }
    if (this.phase === 'moving') {
      this.rotation.y += delta * 0.5;
      this.shields.forEach(s => (s.material.opacity = 0.5));
    } else {
      this.shields.forEach(s => (s.material.opacity = 0.2));
    }
  }

  takeDamage(amount, playerObj) {
    if (this.phase !== 'idle') {
      // heals instead of taking damage when not idle
      this.health = Math.min(this.maxHealth, this.health + amount);
      if (this.reflecting && playerObj && typeof playerObj.health === 'number') {
        playerObj.health -= 10;
      }
      return;
    }
    super.takeDamage(amount);
  }
}
