// Three.js utilities for building and traversing the spherical navigation mesh.
// The previous implementation relied on a global THREE namespace which broke
// bundling and unit tests. The module now imports the bundled three.js copy
// directly so it works consistently in both the browser and Node test
// environment.
import * as THREE from '../vendor/three.module.js';
import { state } from './state.js';
import { uvToSpherePos, spherePosToUv } from './utils.js';
import { sanitizeUv } from './movement3d.js';

let nodes = [];
let neighbors = [];
let debugLines = [];
let pathCache = new Map();
const CACHE_LIMIT = 100;
let lastObsHash = '';

class MinHeap {
  constructor(compare) {
    this.compare = compare;
    this.heap = [];
  }
  push(value) {
    this.heap.push(value);
    this._bubbleUp(this.heap.length - 1);
  }
  pop() {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._bubbleDown(0);
    }
    return top;
  }
  size() { return this.heap.length; }
  _bubbleUp(index) {
    const { heap, compare } = this;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (compare(heap[index], heap[parent]) >= 0) break;
      [heap[index], heap[parent]] = [heap[parent], heap[index]];
      index = parent;
    }
  }
  _bubbleDown(index) {
    const { heap, compare } = this;
    const length = heap.length;
    while (true) {
      let left = index * 2 + 1;
      let right = index * 2 + 2;
      let smallest = index;
      if (left < length && compare(heap[left], heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && compare(heap[right], heap[smallest]) < 0) {
        smallest = right;
      }
      if (smallest === index) break;
      [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
      index = smallest;
    }
  }
}

export function buildNavMesh(subdiv = 2, radius = 1){
  const geo = new THREE.IcosahedronGeometry(radius, subdiv);
  const pos = geo.getAttribute('position');

  // IcosahedronGeometry in newer THREE versions is non-indexed.
  // Build a deduplicated vertex list and adjacency map manually.
  nodes = [];
  const key = (x,y,z)=>`${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`;
  const vertMap = new Map();
  const triIdx = [];

  for(let i=0;i<pos.count;i+=3){
    const verts=[];
    for(let j=0;j<3;j++){
      const x=pos.getX(i+j); const y=pos.getY(i+j); const z=pos.getZ(i+j);
      const k=key(x,y,z);
      let idx=vertMap.get(k);
      if(idx===undefined){
        idx = nodes.length;
        nodes.push(new THREE.Vector3(x,y,z));
        vertMap.set(k,idx);
      }
      verts.push(idx);
    }
    triIdx.push(...verts);
  }

  const neigh = Array.from({length:nodes.length}, ()=>new Set());
  for(let i=0;i<triIdx.length;i+=3){
    const a=triIdx[i], b=triIdx[i+1], c=triIdx[i+2];
    neigh[a].add(b); neigh[a].add(c);
    neigh[b].add(a); neigh[b].add(c);
    neigh[c].add(a); neigh[c].add(b);
  }

  neighbors = neigh.map(s=>Array.from(s));
  pathCache.clear();
}

function closestNodeIdx(pos){
  let best=-1, dist=Infinity;
  nodes.forEach((n,i)=>{ const d=n.distanceTo(pos); if(d<dist){dist=d;best=i;} });
  return best;
}

function isBlocked(idx){
  const node = nodes[idx];
  return state.pathObstacles.some(o=>{
    const obs = uvToSpherePos(o.u,o.v,1);
    return node.distanceTo(obs) < o.radius;
  });
}

function obstaclesHash(){
  return state.pathObstacles.map(o=>`${o.u.toFixed(2)},${o.v.toFixed(2)},${o.radius}`).join('|');
}

export function findPath(startUv, endUv, { maxIterations = 2000 } = {}) {
  if(!nodes.length) buildNavMesh();
  const obsHash = obstaclesHash();
  if(obsHash !== lastObsHash){
    pathCache.clear();
    lastObsHash = obsHash;
  }

  // Sanitize inputs so callers can provide loose coordinates without agents
  // getting stuck on the sphere's poles or outside the valid UV range.
  const startSafe = sanitizeUv(startUv);
  const endSafe = sanitizeUv(endUv);
  const startPos = uvToSpherePos(startSafe.u, startSafe.v, 1);
  const endPos   = uvToSpherePos(endSafe.u, endSafe.v, 1);
  const start = closestNodeIdx(startPos);
  const goal  = closestNodeIdx(endPos);
  if(start===goal){
    return [startSafe, endSafe];
  }
  const cacheKey = `${start}-${goal}-${obsHash}`;
  if(pathCache.has(cacheKey)) return pathCache.get(cacheKey);
  const came = new Map();
  const g = new Map([[start, 0]]);
  const f = new Map([[start, nodes[start].distanceTo(nodes[goal])]]);
  const open = new MinHeap((a, b) => f.get(a) - f.get(b));
  const inOpen = new Set();
  open.push(start);
  inOpen.add(start);
  const visited = new Set([start]);
  let iterations=0;
  while (open.size() && iterations < maxIterations) {
    iterations++;
    const cur = open.pop();
    inOpen.delete(cur);
    if(cur===goal) break;
    for(const n of neighbors[cur]){
      if(isBlocked(n)) continue;
      const ng = g.get(cur)+nodes[cur].distanceTo(nodes[n]);
      if(!g.has(n) || ng < g.get(n)){
        g.set(n,ng);
        f.set(n, ng + nodes[n].distanceTo(nodes[goal]));
        came.set(n,cur);
        if(!visited.has(n)){
          visited.add(n);
          if(!inOpen.has(n)){ open.push(n); inOpen.add(n); }
        }
      }
    }
  }
  let cur = goal;
  if(!came.has(cur) && cur !== start) return [startSafe, endSafe];
  const path = [];
  while(cur !== undefined){
    path.push(cur);
    cur = came.get(cur);
  }
  path.reverse();
  const result = path.map(i => sanitizeUv(spherePosToUv(nodes[i], 1)));
  pathCache.set(cacheKey, result);
  if(pathCache.size > CACHE_LIMIT){
    const firstKey = pathCache.keys().next().value;
    pathCache.delete(firstKey);
  }
  return result;
}

export function debugPath(path){
  const points = path.map(p => uvToSpherePos(p.u,p.v,1));
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color: 0xff00ff });
  const line = new THREE.Line(geom, mat);
  debugLines.push(line);
  return line;
}

export function clearDebug(){
  debugLines.forEach(l => l.geometry.dispose());
  debugLines.forEach(l => l.material.dispose());
  debugLines.length = 0;
}
