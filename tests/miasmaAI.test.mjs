import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { MiasmaAI } = await import('../modules/agents/MiasmaAI.js');

const boss = new MiasmaAI(1);
const player = { position: new THREE.Vector3(0,0,0), health: 10 };
boss.lastGas = Date.now() - 11000;
boss.update(0.016, player, {}, { play:()=>{} });
assert.ok(boss.isGasActive, 'gas activated');

boss.update(0.1, player, {}, { play:()=>{} });
assert.ok(player.health < 10, 'player damaged by gas');
console.log('miasma AI test passed');
