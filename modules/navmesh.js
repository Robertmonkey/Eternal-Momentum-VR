// Use global THREE provided by A-Frame in the browser. Tests provide it via node
// "three" package, so no import is required here to avoid an unresolved module
// specifier error in browsers.
import { state } from './state.js';
import { uvToSpherePos, spherePosToUv } from './utils.js';

let nodes = [];
let neighbors = [];
let pathCache = new Map();
let lastObsHash = '';

export function buildNavMesh(subdiv = 2, radius = 1){
  const geo = new THREE.IcosahedronGeometry(radius, subdiv);
  const pos = geo.getAttribute('position');
  nodes = [];
  for(let i=0;i<pos.count;i++){
    nodes.push(new THREE.Vector3().fromBufferAttribute(pos,i));
  }
  const neigh = new Array(nodes.length).fill(0).map(()=>new Set());
  const idx = geo.index.array;
  for(let i=0;i<idx.length;i+=3){
    const a=idx[i], b=idx[i+1], c=idx[i+2];
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

export function findPath(startUv,endUv){
  if(!nodes.length) buildNavMesh();
  const obsHash = obstaclesHash();
  if(obsHash !== lastObsHash){
    pathCache.clear();
    lastObsHash = obsHash;
  }
  const startPos = uvToSpherePos(startUv.u,startUv.v,1);
  const endPos   = uvToSpherePos(endUv.u,endUv.v,1);
  const start = closestNodeIdx(startPos);
  const goal  = closestNodeIdx(endPos);
  const cacheKey = `${start}-${goal}-${obsHash}`;
  if(pathCache.has(cacheKey)) return pathCache.get(cacheKey);
  const open=[start];
  const came=new Map();
  const g=new Map([[start,0]]);
  const f=new Map([[start,nodes[start].distanceTo(nodes[goal])]]);
  const visited=new Set([start]);
  while(open.length){
    open.sort((a,b)=>f.get(a)-f.get(b));
    const cur=open.shift();
    if(cur===goal) break;
    for(const n of neighbors[cur]){
      if(isBlocked(n)) continue;
      const ng = g.get(cur)+nodes[cur].distanceTo(nodes[n]);
      if(!g.has(n) || ng < g.get(n)){
        g.set(n,ng);
        f.set(n, ng + nodes[n].distanceTo(nodes[goal]));
        came.set(n,cur);
        if(!visited.has(n)){ visited.add(n); open.push(n); }
      }
    }
  }
  let cur=goal;
  if(!came.has(cur) && cur!==start) return [startUv,endUv];
  const path=[];
  while(cur!==undefined){
    path.push(cur);
    cur=came.get(cur);
  }
  path.reverse();
  const result = path.map(i=>spherePosToUv(nodes[i],1));
  pathCache.set(cacheKey, result);
  return result;
}
