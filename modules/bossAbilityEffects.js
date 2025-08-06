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
    case 'vampire': {
      // swirling crimson orbs representing stolen lifeblood
      for (let i = 1; i <= stage; i++) {
        const ringRadius = radius * (0.8 + i * 0.3);
        addRing(group, ringRadius, baseMat);
        const orbGeom = new THREE.SphereGeometry(radius * 0.15, 8, 8);
        for (let j = 0; j < i * 4; j++) {
          const orb = new THREE.Mesh(orbGeom, baseMat.clone());
          const ang = (j / (i * 4)) * Math.PI * 2;
          orb.position.set(Math.cos(ang) * ringRadius, Math.sin(ang * 2) * radius * 0.2, Math.sin(ang) * ringRadius);
          group.add(orb);
        }
      }
      break;
    }
    case 'gravity': {
      // orbiting satellites caught in a gravitational well
      for (let i = 1; i <= stage; i++) {
        const ringRadius = radius * (0.9 + i * 0.4);
        addRing(group, ringRadius, baseMat);
        const satGeom = new THREE.SphereGeometry(radius * 0.12, 8, 8);
        for (let j = 0; j < i * 3; j++) {
          const sat = new THREE.Mesh(satGeom, baseMat.clone());
          const ang = (j / (i * 3)) * Math.PI * 2;
          sat.position.set(Math.cos(ang) * ringRadius, 0, Math.sin(ang) * ringRadius);
          group.add(sat);
        }
      }
      break;
    }
    case 'syphon': {
      // energy ring funneling toward the center
      for (let i = 1; i <= stage; i++) {
        const ringRadius = radius * (0.8 + i * 0.3);
        addRing(group, ringRadius, baseMat);
        const coneGeom = new THREE.ConeGeometry(radius * 0.3, radius * 0.8, 16);
        const cone = new THREE.Mesh(coneGeom, baseMat.clone());
        cone.rotation.x = Math.PI / 2;
        cone.scale.setScalar(0.6 + i * 0.2);
        group.add(cone);
      }
      break;
    }
    case 'centurion': {
      // cage-like energy bars that intensify with each stage
      addRing(group, radius, baseMat);
      const barGeom = new THREE.BoxGeometry(radius * 0.1, radius * 1.6, radius * 0.1);
      const bars = stage * 2 + 2;
      for (let i = 0; i < bars; i++) {
        const bar = new THREE.Mesh(barGeom, baseMat.clone());
        const ang = (i / bars) * Math.PI * 2;
        bar.position.set(Math.cos(ang) * radius, 0, Math.sin(ang) * radius);
        group.add(bar);
      }
      if (stage > 1) {
        addRing(group, radius * 1.3, baseMat);
      }
      if (stage > 2) {
        addRing(group, radius * 1.6, baseMat);
      }
      break;
    }
    case 'puppeteer': {
      // marionette cross with dangling threads
      const crossA = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.4, radius * 0.1, radius * 0.1), baseMat.clone());
      const crossB = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.1, radius * 1.4, radius * 0.1), baseMat.clone());
      crossA.position.y = radius * 0.6;
      crossB.position.y = radius * 0.6;
      group.add(crossA);
      group.add(crossB);
      const threadGeom = new THREE.CylinderGeometry(radius * 0.05, radius * 0.05, radius, 8);
      const beadGeom = new THREE.SphereGeometry(radius * 0.1, 8, 8);
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        const thread = new THREE.Mesh(threadGeom, baseMat.clone());
        thread.position.set(Math.cos(ang) * radius * 0.5, 0, Math.sin(ang) * radius * 0.5);
        group.add(thread);
        for (let j = 1; j <= stage; j++) {
          const bead = new THREE.Mesh(beadGeom, baseMat.clone());
          bead.position.set(Math.cos(ang) * radius * (0.5 + j * 0.25), -radius * 0.5, Math.sin(ang) * radius * (0.5 + j * 0.25));
          group.add(bead);
        }
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
