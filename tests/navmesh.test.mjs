import assert from 'assert';
import * as THREE from 'three';

// minimal DOM stubs for state.js dependencies
global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};


const { buildNavMesh, findPath, debugPath, clearDebug } = await import('../modules/navmesh.js');

buildNavMesh(1, 1);
const path = findPath({u:0, v:0}, {u:0.5, v:0.25});
assert(path.length >= 2, 'Path should have at least start and end');
const line = debugPath(path);
assert(line.isLine, 'debugPath returns a THREE.Line');
clearDebug();

console.log('navmesh tests passed');
