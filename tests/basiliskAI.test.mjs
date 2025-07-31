import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

// stub DOM
global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { BasiliskAI } = await import('../modules/agents/BasiliskAI.js');

const boss = new BasiliskAI(1);
boss.health = boss.maxHealth * 0.5;
const player = { position: boss.zones[0].pos.clone(), stunnedUntil: 0 };
let petrified = false;
const helpers = {
  play: () => {},
  addStatusEffect: (name) => { if (name === 'Petrified') petrified = true; }
};

boss.update(1.6, player, helpers);
assert.ok(player.stunnedUntil > Date.now(), 'player stunned');
assert.ok(petrified, 'status effect applied');
console.log('basilisk AI test passed');
