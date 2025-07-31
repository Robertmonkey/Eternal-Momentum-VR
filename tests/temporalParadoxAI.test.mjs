import assert from 'assert';

global.window = {};
global.document = { getElementById: () => null, createElement: () => ({ getContext: () => ({}) }) };

const { TemporalParadoxAI } = await import('../modules/agents/TemporalParadoxAI.js');

const boss = new TemporalParadoxAI(1);
const state = { effects: [], player: { position:{}, r:1 } };
boss.lastEcho = Date.now() - 9000;
boss.update(0.016, { position:new (await import('../vendor/three.module.js')).Vector3() }, state, { play:()=>{} });
assert.ok(state.effects.some(e => e.type === 'paradox_echo'), 'echo added');
console.log('temporal paradox AI test passed');
