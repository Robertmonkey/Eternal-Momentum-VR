import * as THREE from '../vendor/three.module.js';

export function createBossModel(kind, color = 0xffffff, radius = 0.65) {
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.5,
  });
  let mesh;
  switch (kind) {
    case 'splitter': {
      // Fracturing core surrounded by drifting shards
      const group = new THREE.Group();
      group.add(new THREE.Mesh(new THREE.OctahedronGeometry(radius * 0.6), material));
      const shardGeom = new THREE.TetrahedronGeometry(radius * 0.3);
      const shardMat = material.clone();
      [[radius, 0, 0], [-radius, 0, 0], [0, radius, 0], [0, -radius, 0]].forEach(pos => {
        const shard = new THREE.Mesh(shardGeom, shardMat);
        shard.position.set(...pos);
        group.add(shard);
      });
      mesh = group;
      break;
    }
    case 'reflector': {
      // Core with a translucent reflective shield and outer ring
      const group = new THREE.Group();
      const core = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.7, 32, 16), material);
      const shieldMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.25,
        metalness: 1,
        roughness: 0.1,
      });
      const shield = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.2, 32, 16), shieldMat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.4, radius / 8, 16, 64), material.clone());
      ring.rotation.x = Math.PI / 2;
      group.add(core);
      group.add(shield);
      group.add(ring);
      mesh = group;
      break;
    }
    case 'vampire': {
      // Dark core orbited by crimson lifeblood spheres
      const group = new THREE.Group();
      const coreMat = material.clone();
      coreMat.color = new THREE.Color(0x111111);
      const core = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.8, 32, 16), coreMat);
      group.add(core);
      const orbGeom = new THREE.SphereGeometry(radius * 0.3, 16, 16);
      const orbMat = material.clone();
      orbMat.emissiveIntensity = 1;
      [[radius, 0, 0], [-radius, 0, 0], [0, 0, radius], [0, 0, -radius]].forEach(pos => {
        const orb = new THREE.Mesh(orbGeom, orbMat);
        orb.position.set(...pos);
        group.add(orb);
      });
      mesh = group;
      break;
    }
    case 'syphon':
      mesh = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.2, radius / 3, 16, 32), material);
      break;
    case 'centurion':
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius * 0.8, radius * 2, 16), material);
      break;
    case 'gravity': {
      // Massive core with orbiting satellites captured in its ring
      const group = new THREE.Group();
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), material);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.4, radius / 6, 8, 32), material.clone());
      ring.rotation.x = Math.PI / 2;
      group.add(sphere);
      group.add(ring);
      const satelliteGeom = new THREE.SphereGeometry(radius * 0.3, 16, 16);
      for (let i = 0; i < 3; i++) {
        const sat = new THREE.Mesh(satelliteGeom, material.clone());
        const ang = (i / 3) * Math.PI * 2;
        sat.position.set(Math.cos(ang) * radius * 1.4, 0, Math.sin(ang) * radius * 1.4);
        group.add(sat);
      }
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
    case 'epoch_ender': {
      // Final boss with core wrapped by three crossing halos
      const group = new THREE.Group();
      const core = new THREE.Mesh(new THREE.DodecahedronGeometry(radius), material);
      const haloGeom = new THREE.TorusGeometry(radius * 1.3, radius / 8, 16, 64);
      const haloA = new THREE.Mesh(haloGeom, material.clone());
      const haloB = new THREE.Mesh(haloGeom, material.clone());
      const haloC = new THREE.Mesh(haloGeom, material.clone());
      haloA.rotation.x = Math.PI / 2;
      haloB.rotation.y = Math.PI / 2;
      haloC.rotation.z = Math.PI / 2;
      group.add(core);
      group.add(haloA);
      group.add(haloB);
      group.add(haloC);
      mesh = group;
      break;
    }
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
