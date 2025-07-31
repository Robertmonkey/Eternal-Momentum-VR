import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = { getElementById: () => null, createElement: () => ({ getContext: () => ({}) }) };


const { HelixWeaverAI } = await import('../modules/agents/HelixWeaverAI.js');

const boss = new HelixWeaverAI(1);
const state = { effects: [] };

boss.health = boss.maxHealth * 0.3;
boss.update(0.016, null, state);

assert.strictEqual(boss.activeArms, 4, 'arms scaled with health');
assert.ok(state.effects.length > 0, 'projectiles spawned');
console.log('helix weaver AI test passed');
