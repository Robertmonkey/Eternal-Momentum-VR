import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = { getElementById: () => null, createElement: () => ({ getContext: () => ({}) }) };


const { ShaperOfFateAI } = await import('../modules/agents/ShaperOfFateAI.js');

const boss = new ShaperOfFateAI(1);
boss.phase = 'prophecy';
boss.phaseTimer = Date.now() - 1;
const player = { position: new THREE.Vector3(0,0,0) };
boss.runes = [
  { pos: new THREE.Vector3(0.1,0,0), type: 'heal' },
  { pos: new THREE.Vector3(2,0,0), type: 'nova' },
  { pos: new THREE.Vector3(-2,0,0), type: 'shockwave' }
];

boss.health = 500;
boss.update(0.016, player, {}, { play: () => {} });

assert.strictEqual(boss.phase, 'fulfillment', 'phase advanced');
assert.strictEqual(boss.health, 530, 'heal rune restored health');
console.log('shaper of fate AI test passed');
