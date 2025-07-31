import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { LoopingEyeAI } = await import('../modules/agents/LoopingEyeAI.js');

const boss = new LoopingEyeAI(1);
// force immediate teleport
boss.lastTeleport = Date.now() - 3000;
boss.teleportingAt = Date.now() - 10;
boss.teleportTarget = new THREE.Vector3(0,1,0);
const before = boss.position.clone();
boss.update(0.016, {}, { play:()=>{}, spawnParticles:()=>{} });
assert.ok(!boss.position.equals(before), 'teleport executed');
console.log('looping eye AI test passed');
