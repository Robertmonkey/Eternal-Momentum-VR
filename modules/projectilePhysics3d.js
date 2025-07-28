import * as THREE from 'three';
import { state } from './state.js';
import { uvToSpherePos, spherePosToUv } from './utils.js';

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
      d = { pos };
      dataMap.set(p,d);
    }
    const nextPos = uvToSpherePos((p.x + p.dx)/width, (p.y + p.dy)/height, radius);
    const vel = nextPos.clone().sub(d.pos);
    d.pos.add(vel).normalize().multiplyScalar(radius);
    const uv = spherePosToUv(d.pos, radius);
    p.x = uv.u * width;
    p.y = uv.v * height;
  });
}
