import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

// stub minimal DOM
global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { AethelAI, UmbraAI } = await import('../modules/agents/AethelUmbraAI.js');

let healCalled = false;
let projCalled = false;
let bothDead = false;

const helpers = {
  spawnHealingZone: () => { healCalled = true; },
  spawnProjectile: () => { projCalled = true; }
};

const aethel = new AethelAI(1);
const umbra = new UmbraAI(1);
aethel.partner = umbra;
umbra.partner = aethel;
aethel.onBothDeath = () => { bothDead = true; };
umbra.onBothDeath = () => { bothDead = true; };

// Aethel healing zone after 6s
aethel.update(6.1, helpers);
assert.ok(healCalled, 'Aethel spawns healing zone');

// Umbra projectile after 2s
umbra.update(2.1, helpers, new THREE.Vector3(1,0,0));
assert.ok(projCalled, 'Umbra fires projectile');

// Ensure onBothDeath triggers only when both dead
healCalled = projCalled = false;
aethel.die();
assert.ok(!bothDead, 'onBothDeath not triggered after first death');
umbra.die();
assert.ok(bothDead, 'onBothDeath triggered when both dead');

console.log('aethel & umbra AI test passed');
