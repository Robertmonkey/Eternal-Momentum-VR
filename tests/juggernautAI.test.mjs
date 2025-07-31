import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { JuggernautAI } = await import('../modules/agents/JuggernautAI.js');

const boss = new JuggernautAI(1);
const player = { position: new THREE.Vector3(1,0,0) };
// prepare charge
boss.lastCharge = Date.now() - 8000;
boss.update(0.016, player, { play:()=>{} });
assert.ok(boss.isCharging, 'charging started');
// after charge start time
boss.chargeStart = Date.now() - 10;
const posBefore = boss.position.clone();
boss.update(0.1, player, { play:()=>{} });
assert.ok(!boss.position.equals(posBefore), 'boss moved during charge');
console.log('juggernaut AI test passed');
