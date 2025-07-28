// modules/enemyAI3d.js
// -----------------------------------------------------------------------------
// Basic 3-D enemy movement helpers. Converts legacy 2-D enemy positions to
// vectors on the gameplay sphere and moves them toward the player avatar.
// This begins the port of enemy AI logic into fully 3-D aware components.

import { state } from './state.js';
import { uvToSpherePos, spherePosToUv } from './utils.js';
import { moveTowards } from './movement3d.js';

const GRID_W = 36;
const GRID_H = 18;

function cellKey(i,j){ return `${i}|${j}`; }

function uvToCell(u,v){
  const i = ((u*GRID_W)%GRID_W+GRID_W)%GRID_W;
  const j = Math.min(Math.max(Math.round(v*GRID_H),0),GRID_H-1);
  return {i:Math.round(i),j};
}

function cellToUv(i,j){
  return {u:(i+0.5)/GRID_W, v:(j+0.5)/GRID_H};
}

function isBlocked(cell){
  return state.pathObstacles.some(o=>{
    const pos = uvToSpherePos(o.u, o.v, 1);
    const cellPos = uvToSpherePos((cell.i+0.5)/GRID_W, (cell.j+0.5)/GRID_H, 1);
    return pos.distanceTo(cellPos) < o.radius;
  });
}

function findPath(startUv,endUv){
  const start = uvToCell(startUv.u,startUv.v);
  const goal  = uvToCell(endUv.u,endUv.v);
  const q=[start];
  const came=new Map();
  const visited=new Set([cellKey(start.i,start.j)]);
  while(q.length){
    const cur=q.shift();
    if(cur.i===goal.i && cur.j===goal.j) break;
    const neigh=[
      {i:(cur.i+1)%GRID_W,j:cur.j},
      {i:(cur.i-1+GRID_W)%GRID_W,j:cur.j},
      {i:cur.i,j:Math.min(cur.j+1,GRID_H-1)},
      {i:cur.i,j:Math.max(cur.j-1,0)}
    ];
    for(const n of neigh){
      const k=cellKey(n.i,n.j);
      if(visited.has(k) || isBlocked(n)) continue;
      visited.add(k);
      came.set(k,cur);
      q.push(n);
    }
  }
  const path=[goal];
  let cur=goal, k=cellKey(cur.i,cur.j);
  if(!came.has(k) && (cur.i!==start.i || cur.j!==start.j)) return [startUv,endUv];
  while(cur.i!==start.i || cur.j!==start.j){
    cur=came.get(cellKey(cur.i,cur.j));
    if(!cur) break;
    path.push(cur);
  }
  path.reverse();
  return path.map(c=>cellToUv(c.i,c.j));
}

export function addPathObstacle(u,v,radius=0.1){
  state.pathObstacles.push({u,v,radius});
}

export function clearPathObstacles(){
  state.pathObstacles.length = 0;
}

/**
 * Update all enemies by moving them slightly toward the player on the
 * sphere's surface. This preserves existing 2-D behaviour while ensuring
 * enemies respect the 3-D battlefield.
 *
 * @param {THREE.Vector3} playerPos - Player position on the sphere.
 * @param {number} radius - Sphere radius.
 * @param {number} width  - Legacy canvas width.
 * @param {number} height - Legacy canvas height.
 */
export function updateEnemies3d(playerPos, radius, width, height){
  const targetUv = spherePosToUv(playerPos, radius);
  state.enemies.forEach(e => {
    const startUv = {u:e.x/width, v:e.y/height};
    const path = findPath(startUv, targetUv);
    const nextUv = path[1] || targetUv;
    const pos3d = uvToSpherePos(startUv.u, startUv.v, radius);
    const target3d = uvToSpherePos(nextUv.u, nextUv.v, radius);
    moveTowards(pos3d, target3d, e.speed || 1, radius);
    const {u,v} = spherePosToUv(pos3d, radius);
    e.x = u * width;
    e.y = v * height;
  });
}
