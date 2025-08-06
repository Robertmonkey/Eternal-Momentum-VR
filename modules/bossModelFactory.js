import * as THREE from '../vendor/three.module.js';

export function createBossModel(kind, color = 0xffffff, radius = 0.65) {
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.5,
  });
  let mesh;
  switch (kind) {
    case 'syphon':
      mesh = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.2, radius / 3, 16, 32), material);
      break;
    case 'centurion':
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius * 0.8, radius * 2, 16), material);
      break;
    case 'gravity': {
      const group = new THREE.Group();
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), material);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.4, radius / 6, 8, 32), material.clone());
      ring.rotation.x = Math.PI / 2;
      group.add(sphere);
      group.add(ring);
      mesh = group;
      break;
    }
    case 'emp':
      mesh = new THREE.Mesh(new THREE.OctahedronGeometry(radius), material);
      break;
    case 'fractal_horror':
      mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2), material);
      break;
    case 'pantheon':
      mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(radius, radius / 4, 64, 8), material);
      break;
    case 'sentinel_pair':
      mesh = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.2, radius * 1.2, radius * 1.2), material);
      break;
    case 'annihilator':
      mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, radius * 2, 16), material);
      break;
    case 'architect':
      mesh = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.5, radius * 1.5, radius * 1.5), material);
      break;
    case 'quantum_shadow':
      material.transparent = true;
      material.opacity = 0.7;
      mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(radius), material);
      break;
    case 'puppeteer':
      mesh = new THREE.Mesh(new THREE.OctahedronGeometry(radius), material);
      break;
    case 'singularity': {
      const group = new THREE.Group();
      material.metalness = 1;
      material.roughness = 0.1;
      const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), material);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.2, radius / 6, 8, 32), material.clone());
      halo.rotation.x = Math.PI / 2;
      group.add(core);
      group.add(halo);
      mesh = group;
      break;
    }
    case 'juggernaut':
      mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(radius * 1.3), material);
      break;
    case 'shaper_of_fate':
      mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(radius, radius / 5, 32, 8), material);
      break;
    case 'time_eater':
      mesh = new THREE.Mesh(new THREE.RingGeometry(radius * 0.5, radius, 32), material);
      mesh.rotation.x = Math.PI / 2;
      break;
    case 'miasma':
      material.transparent = true;
      material.opacity = 0.6;
      mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), material);
      break;
    case 'epoch_ender':
      mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(radius), material);
      break;
    case 'looper': {
      const group = new THREE.Group();
      const eye = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), material);
      const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.3, 16, 16), pupilMat);
      pupil.position.z = radius * 0.7;
      group.add(eye);
      group.add(pupil);
      mesh = group;
      break;
    }
    default:
      mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), material);
  }
  return mesh;
}
