import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { QuantumShadowAI } = await import('../modules/agents/QuantumShadowAI.js');

const boss = new QuantumShadowAI(1);
// force phase change
boss.lastPhaseChange = Date.now() - 8000;
boss.update(0.016, {}, { play:()=>{} });
assert.strictEqual(boss.state, 'superposition', 'entered superposition');
assert.ok(boss.invulnerable, 'is invulnerable');

boss.lastPhaseChange = Date.now() - 4000;
boss.state = 'superposition';
const posBefore = boss.position.clone();
boss.echoes = [new THREE.Vector3(0.5,0,0)];
boss.update(0.016, {}, { play:()=>{} });
assert.strictEqual(boss.state, 'seeking', 'returned to seeking');
assert.ok(!boss.position.equals(posBefore), 'teleported');
console.log('quantum shadow AI test passed');
