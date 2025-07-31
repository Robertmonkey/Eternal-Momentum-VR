import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = { getElementById: () => null, createElement: () => ({ getContext: () => ({}) }) };


const { PantheonAI } = await import('../modules/agents/PantheonAI.js');
const { JuggernautAI } = await import('../modules/agents/JuggernautAI.js');

// force deterministic aspect
const savedRandom = Math.random;
Math.random = () => 0;

const boss = new PantheonAI(1);
boss.spawnAspect('primary', { play: () => {} });
Math.random = savedRandom;

assert.strictEqual(boss.activeAspects.length, 1, 'aspect spawned');
assert.ok(boss.activeAspects[0].ai instanceof JuggernautAI, 'juggernaut aspect');
console.log('pantheon AI test passed');
