// Projectile physics helpers for the VR build.
// Import three.js directly rather than relying on a global THREE namespace.
import * as THREE from '../vendor/three.module.js';
import { state } from './state.js';
import { uvToSpherePos, spherePosToUv } from './utils.js';
import { VR_PROJECTILE_SPEED_SCALE } from './config.js';

let projectileGroup = null;

/**
 * Provide a THREE.Group that newly spawned projectile meshes will be
 * attached to. This is expected to be created by the main VR loop.
 * @param {THREE.Group} group
 */
export function setProjectileGroup(group){
  projectileGroup = group;
}

const dataMap = new WeakMap();
const projectileTypes = new Set([
  'nova_bullet',
  'ricochet_projectile',
  'seeking_shrapnel',
  'helix_bolt',
  'player_fragment'
]);

export function updateProjectiles3d(radius, width, height){
  state.effects.forEach(p=>{
    if(!projectileTypes.has(p.type)) return;
    let d = dataMap.get(p);
    if(!d){
      const pos = uvToSpherePos(p.x/width, p.y/height, radius);
      // Apply VR speed scale once when the projectile is first seen
      p.dx *= VR_PROJECTILE_SPEED_SCALE;
      p.dy *= VR_PROJECTILE_SPEED_SCALE;
      const geom = new THREE.SphereGeometry(radius * 0.02, 6, 6);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
      const mesh = new THREE.Mesh(geom, mat);
      if(projectileGroup) projectileGroup.add(mesh);
      d = { pos, mesh };
      dataMap.set(p,d);
    }
    const nextPos = uvToSpherePos(
      (p.x + p.dx) / width,
      (p.y + p.dy) / height,
      radius
    );
    const vel = nextPos.clone().sub(d.pos);
    d.pos.add(vel).normalize().multiplyScalar(radius);
    const uv = spherePosToUv(d.pos, radius);
    p.x = uv.u * width;
    p.y = uv.v * height;
    if(d.mesh){
      d.mesh.position.copy(d.pos);
    }
  });

  // Clean up meshes for any projectiles that no longer exist
  for(const [p, d] of dataMap.entries()){
    if(!state.effects.includes(p)){
      if(d.mesh && projectileGroup) projectileGroup.remove(d.mesh);
      if(d.mesh) d.mesh.geometry.dispose();
      if(d.mesh) d.mesh.material.dispose();
      dataMap.delete(p);
    }
  }
}
