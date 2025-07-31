import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { SingularityAI } = await import('../modules/agents/SingularityAI.js');

const boss = new SingularityAI(1);
boss.lastAction = Date.now() - 6000;
const player = { position: new THREE.Vector3() };
boss.update(0.016, player, {}, { play:()=>{} });
assert.ok(boss.wells.length > 0, 'gravity well spawned');
console.log('singularity AI test passed');
