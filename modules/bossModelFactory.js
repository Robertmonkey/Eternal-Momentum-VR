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
      const shardGeom = new THREE.TetrahedronGeometry(radius * 0.25);
      const shardMat = material.clone();
      const positions = [
        [radius, 0, 0],
        [-radius, 0, 0],
        [0, radius, 0],
        [0, -radius, 0],
        [0, 0, radius],
        [0, 0, -radius]
      ];
      positions.forEach(([x, y, z]) => {
        const shard = new THREE.Mesh(shardGeom, shardMat);
        shard.position.set(x, y, z);
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
      const nodeGeom = new THREE.SphereGeometry(radius * 0.25, 16, 16);
      for (let i = 0; i < 4; i++) {
        const node = new THREE.Mesh(nodeGeom, material.clone());
        const ang = (i / 4) * Math.PI * 2;
        node.position.set(Math.cos(ang) * radius * 1.4, 0, Math.sin(ang) * radius * 1.4);
        group.add(node);
      }
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
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.2, radius / 8, 16, 32), orbMat.clone());
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
      mesh = group;
      break;
    }
    case 'syphon':
      // Energy ring with inward-pointing funnel
      const syphonGroup = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.2, radius / 3, 16, 32), material);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.6, radius * 1.5, 32), material.clone());
      const disc = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.5, 32), material.clone());
      cone.rotation.x = Math.PI / 2;
      disc.rotation.x = -Math.PI / 2;
      syphonGroup.add(ring);
      syphonGroup.add(cone);
      syphonGroup.add(disc);
      mesh = syphonGroup;
      break;
    case 'centurion': {
      // Central pillar surrounded by cage-like energy bars
      const group = new THREE.Group();
      const core = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, radius * 1.8, 16), material);
      group.add(core);
      const barGeom = new THREE.BoxGeometry(radius * 0.2, radius * 2, radius * 0.2);
      for (let i = 0; i < 4; i++) {
        const bar = new THREE.Mesh(barGeom, material.clone());
        const ang = (i / 4) * Math.PI * 2;
        bar.position.set(Math.cos(ang) * radius, 0, Math.sin(ang) * radius);
        group.add(bar);
      }
      const ringGeom = new THREE.TorusGeometry(radius, radius / 10, 8, 32);
      const topRing = new THREE.Mesh(ringGeom, material.clone());
      const bottomRing = topRing.clone();
      topRing.rotation.x = Math.PI / 2;
      bottomRing.rotation.x = Math.PI / 2;
      topRing.position.y = radius;
      bottomRing.position.y = -radius;
      group.add(topRing);
      group.add(bottomRing);
      mesh = group;
      break;
    }
    case 'gravity': {
      // Massive core with orbiting satellites captured in its ring
      const group = new THREE.Group();
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), material);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.4, radius / 6, 8, 32), material.clone());
      const verticalRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.1, radius / 8, 8, 32), material.clone());
      ring.rotation.x = Math.PI / 2;
      verticalRing.rotation.y = Math.PI / 2;
      group.add(sphere);
      group.add(ring);
      group.add(verticalRing);
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
    case 'sentinel_pair': {
      // Twin pole wrapped by a mid-ring
      const group = new THREE.Group();
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, radius * 2, 16), material);
      const midRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.8, radius / 8, 16, 32), material.clone());
      midRing.rotation.x = Math.PI / 2;
      const topRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.6, radius / 8, 16, 32), material.clone());
      const bottomRing = topRing.clone();
      topRing.rotation.x = Math.PI / 2;
      bottomRing.rotation.x = Math.PI / 2;
      topRing.position.y = radius;
      bottomRing.position.y = -radius;
      group.add(pillar);
      group.add(midRing);
      group.add(topRing);
      group.add(bottomRing);
      mesh = group;
      break;
    }
    case 'annihilator': {
      // Obelisk with a destructive tip
      const group = new THREE.Group();
      const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.4, radius * 0.4, radius * 2.5, 4), material);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.6, radius, 4), material.clone());
      tip.position.y = radius * 1.25;
      const base = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.8, radius / 10, 16, 32), material.clone());
      base.rotation.x = Math.PI / 2;
      group.add(obelisk);
      group.add(tip);
      group.add(base);
      mesh = group;
      break;
    }
    case 'architect': {
      // Constructive core with corner pillars
      const group = new THREE.Group();
      const core = new THREE.Mesh(new THREE.BoxGeometry(radius, radius, radius), material);
      group.add(core);
      const nodeGeom = new THREE.SphereGeometry(radius * 0.2, 8, 8);
      [-1, 1].forEach(x => {
        [-1, 1].forEach(y => {
          [-1, 1].forEach(z => {
            const node = new THREE.Mesh(nodeGeom, material.clone());
            node.position.set(x * radius, y * radius, z * radius);
            group.add(node);
          });
        });
      });
      const edgeMat = new THREE.LineBasicMaterial({ color });
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(radius, radius, radius)),
        edgeMat
      );
      group.add(edges);
      mesh = group;
      break;
    }
    case 'quantum_shadow': {
      // Layered translucent tetrahedrons to imply shifting states
      material.transparent = true;
      material.opacity = 0.5;
      const group = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const tMat = material.clone();
        tMat.opacity = 0.3 + i * 0.2;
        const t = new THREE.Mesh(new THREE.TetrahedronGeometry(radius), tMat);
        t.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        group.add(t);
      }
      const core = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.3, 16, 16), material.clone());
      group.add(core);
      mesh = group;
      break;
    }
    case 'puppeteer': {
      // Core orb with handle and dangling threads
      const group = new THREE.Group();
      const core = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.6, 16, 16), material);
      group.add(core);
      const crossA = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.2, radius * 0.15, radius * 0.15), material.clone());
      const crossB = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.15, radius * 1.2, radius * 0.15), material.clone());
      crossA.position.y = radius;
      crossB.position.y = radius;
      group.add(crossA);
      group.add(crossB);
      const threadGeom = new THREE.CylinderGeometry(radius * 0.05, radius * 0.05, radius, 8);
      const offsets = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ];
      const beadGeom = new THREE.SphereGeometry(radius * 0.1, 8, 8);
      offsets.forEach(([x, z]) => {
        const thread = new THREE.Mesh(threadGeom, material.clone());
        thread.position.set(x * radius * 0.5, radius * 0.5, z * radius * 0.5);
        group.add(thread);
        const bead = new THREE.Mesh(beadGeom, material.clone());
        bead.position.set(x * radius, 0, z * radius);
        group.add(bead);
      });
      mesh = group;
      break;
    }
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
      const innerMat = material.clone();
      innerMat.emissiveIntensity = 1;
      const inner = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.5, 32, 16), innerMat);
      group.add(core);
      group.add(haloA);
      group.add(haloB);
      group.add(haloC);
      group.add(inner);
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
