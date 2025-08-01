import assert from 'assert';
import * as THREE from 'three';

// minimal DOM stubs for state.js dependencies
global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { state } = await import('../modules/state.js');
const { buildNavMesh, findPath } = await import('../modules/navmesh.js');

buildNavMesh(1, 1);
state.pathObstacles.length = 0;
for(let i=0;i<50;i++){
  state.pathObstacles.push({u:(i%10)/10, v:Math.floor(i/10)/5, radius:0.05});
}

for(let i=0;i<100;i++){
  const start = {u:Math.random(), v:Math.random()};
  const end = {u:Math.random(), v:Math.random()};
  const path = findPath(start,end);
  assert(path.length>=2, 'stress path should contain points');
}

console.log('navmesh stress test passed');
