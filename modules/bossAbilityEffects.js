import * as THREE from '../vendor/three.module.js';
import { state } from './state.js';
import { getScene } from './scene.js';

function addRing(group, radius, material) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, radius / 8, 8, 32), material.clone());
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
}

export function createAbilityEffect(kind = 'generic', stage = 1, color = 0xffffff, radius = 1) {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.7,
  });

  switch (kind) {
    case 'splitter': {
      addRing(group, radius * 1.0, baseMat);
      if (stage > 1) {
        addRing(group, radius * 1.4, baseMat);
        const shardGeom = new THREE.TetrahedronGeometry(radius * 0.25);
        for (let i = 0; i < stage * 4; i++) {
          const shard = new THREE.Mesh(shardGeom, baseMat.clone());
          const angle = (i / (stage * 4)) * Math.PI * 2;
          shard.position.set(Math.cos(angle) * radius * 1.4, 0, Math.sin(angle) * radius * 1.4);
          group.add(shard);
        }
      }
      if (stage > 2) {
        addRing(group, radius * 1.8, baseMat);
      }
      break;
    }
    case 'reflector': {
      const shield = new THREE.Mesh(new THREE.SphereGeometry(radius * (1 + 0.2 * stage), 32, 16), baseMat.clone());
      shield.material.opacity = 0.3;
      group.add(shield);
      for (let i = 1; i < stage; i++) {
        addRing(group, radius * (1 + i * 0.3), baseMat);
      }
      break;
    }
    case 'aethel':
    case 'umbra': {
      const geo = kind === 'aethel'
        ? new THREE.DodecahedronGeometry(radius * 0.5)
        : new THREE.IcosahedronGeometry(radius * 0.6);
      const core = new THREE.Mesh(geo, baseMat.clone());
      group.add(core);
      for (let i = 1; i <= stage; i++) {
        addRing(group, radius * (0.8 + i * 0.4), baseMat);
      }
      break;
    }
    default: {
      for (let i = 1; i <= stage; i++) {
        addRing(group, radius * (0.8 + i * 0.3), baseMat);
      }
    }
  }

  group.userData.kind = kind;
  group.userData.stage = stage;
  return group;
}

export function spawnBossAbilityEffect(owner, stage = 1, duration = 1000) {
  if (!owner) return;
  const color = owner.model && owner.model.material && owner.model.material.color
    ? owner.model.material.color.getHex()
    : 0xffffff;
  const radius = owner.r || 1;
  const mesh = createAbilityEffect(owner.kind || 'generic', stage, color, radius);
  mesh.position.copy(owner.position);
  getScene().add(mesh);
  state.effects.push({
    type: 'boss_ability',
    owner,
    mesh,
    stage,
    startTime: Date.now(),
    duration,
  });
}
