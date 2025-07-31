import assert from 'assert';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { TimeEaterAI } = await import('../modules/agents/TimeEaterAI.js');

const boss = new TimeEaterAI(1);
boss.lastAbility = Date.now() - 6000;
let spawned = 0;
const helpers = { addSlowZone: () => { spawned++; }, play:()=>{} };

boss.update(0.016, helpers);
assert.ok(spawned >= 4, 'slow zones spawned');
console.log('time eater AI test passed');
