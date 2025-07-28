import assert from 'assert';
import * as THREE from 'three';

// minimal DOM stubs for state.js dependencies
global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

// provide global THREE for navmesh module
global.THREE = THREE;

const { buildNavMesh, findPath } = await import('../modules/navmesh.js');

buildNavMesh(1, 1);
const path = findPath({u:0, v:0}, {u:0.5, v:0.25});
assert(path.length >= 2, 'Path should have at least start and end');

console.log('navmesh tests passed');
