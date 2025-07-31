import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = { getElementById: () => null, createElement: () => ({ getContext: () => ({}) }) };


const { ObeliskAI } = await import('../modules/agents/ObeliskAI.js');

const boss = new ObeliskAI(1);

// Kill conduits
boss.conduits.forEach(c => c.alive = false);

boss.update(0.016, null, {});
assert.ok(!boss.invulnerable, 'invulnerability removed when conduits dead');
console.log('obelisk AI test passed');
