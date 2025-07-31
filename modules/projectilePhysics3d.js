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

// Use a standard Map so we can iterate over stored data when cleaning up.
// WeakMap would prevent iteration and caused runtime errors.
const dataMap = new Map();
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
    let mesh = dataMap.get(p);

    if(!p.position){
      const pos = uvToSpherePos((p.x || 0)/width, (p.y || 0)/height, radius);
      p.position = pos;
      const next = uvToSpherePos(
        ((p.x || 0) + (p.dx || 0)) / width,
        ((p.y || 0) + (p.dy || 0)) / height,
        radius
      );
      p.velocity = next.sub(pos).multiplyScalar(VR_PROJECTILE_SPEED_SCALE);
      delete p.dx; delete p.dy;
    }

    if(!mesh){
      const geom = new THREE.SphereGeometry(radius * 0.02, 6, 6);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
      mesh = new THREE.Mesh(geom, mat);
      if(projectileGroup) projectileGroup.add(mesh);
      dataMap.set(p, mesh);
    }

    p.position.add(p.velocity).normalize().multiplyScalar(radius);
    const uv = spherePosToUv(p.position, radius);
    p.x = uv.u * width;
    p.y = uv.v * height;
    if(mesh){
      mesh.position.copy(p.position);
    }
  });

  // Clean up meshes for any projectiles that no longer exist
  dataMap.forEach((d, p) => {
    if(!state.effects.includes(p)){
      if(d.mesh && projectileGroup) projectileGroup.remove(d.mesh);
      if(d.mesh) d.mesh.geometry.dispose();
      if(d.mesh) d.mesh.material.dispose();
      dataMap.delete(p);
    }
  });
}
