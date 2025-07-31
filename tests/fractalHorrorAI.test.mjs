import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = { getElementById: () => null, createElement: () => ({ getContext: () => ({}) }) };


const { FractalHorrorAI } = await import('../modules/agents/FractalHorrorAI.js');

const parent = new THREE.Group();
const state = { enemies: [] };
const boss = new FractalHorrorAI(1, 1);
parent.add(boss);
state.enemies.push(boss);

boss.health = boss.maxHealth * 0.4;
boss.update(0.016, null, state);

assert.strictEqual(state.enemies.length, 3, 'two fractal children spawned');
assert.ok(!boss.alive, 'original fractal died');
console.log('fractal horror AI test passed');
