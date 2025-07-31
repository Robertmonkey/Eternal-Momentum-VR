import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = { getElementById: () => null, createElement: () => ({ getContext: () => ({}) }) };

const { SyphonAI } = await import('../modules/agents/SyphonAI.js');

const boss = new SyphonAI(1);
boss.lastSyphon = Date.now() - 8000;
let disabled = false;
const helpers = { play:()=>{}, disableOffensivePower:() => { disabled = true; } };

// immediate timeout
const originalSetTimeout = global.setTimeout;
global.setTimeout = (fn) => fn();

boss.update(0.016, { position: boss.position.clone() }, {}, helpers);

global.setTimeout = originalSetTimeout;
assert.ok(disabled, 'power disabled');
console.log('syphon AI test passed');
