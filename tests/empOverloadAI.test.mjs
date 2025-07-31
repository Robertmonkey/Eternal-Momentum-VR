import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { state, resetGame } = await import('../modules/state.js');
const { EMPOverloadAI } = await import('../modules/agents/EMPOverloadAI.js');

resetGame(false);
state.offensiveInventory = ['a', 'b', 'c'];
state.defensiveInventory = ['d', 'e', 'f'];

const boss = new EMPOverloadAI(1);
let played = false;
let stunned = false;
const helpers = {
  play: () => { played = true; },
  addStatusEffect: (n) => { if (n === 'Stunned') stunned = true; }
};

boss.discharge(helpers, state, 2048, 1024);

assert.deepStrictEqual(state.offensiveInventory, [null, null, null], 'offensive cleared');
assert.deepStrictEqual(state.defensiveInventory, [null, null, null], 'defensive cleared');
assert.ok(boss.bolts.length > 0, 'bolts spawned');
assert.ok(played, 'sound played');
assert.ok(stunned, 'status effect applied');

boss.bolts.forEach(b => b.life = 0.1);
boss.update(0.2, 2048, 1024, helpers, state, () => {});
assert.strictEqual(boss.bolts.length, 0, 'bolts expire after update');

console.log('emp overload AI test passed');
