import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { state, resetGame } = await import('../modules/state.js');
const { VampireAI } = await import('../modules/agents/VampireAI.js');

resetGame(false);
state.player.health = 90;
state.player.maxHealth = 100;
const boss = new VampireAI(1);
boss.health = 139;

// force heal after timeout
const now = Date.now();
boss.lastHit = now - 4000;
boss.lastHeal = now - 6000;

let played = false;
const helpers = {
  play: () => { played = true; },
  spawnParticles: () => {}
};

// stub Date.now
const realNow = Date.now;
Date.now = () => now;

boss.update(0, state.player, state, helpers);

assert(played, 'heal sound played');
assert.strictEqual(boss.health, 144, 'boss healed up to max');

// test pickup spawn on damage
const realRandom = Math.random;
Math.random = () => 0.1; // ensure drop
boss.takeDamage(10, state.player, state, helpers);
assert.strictEqual(state.pickups.length, 1, 'pickup spawned');
state.pickups[0].customApply();
assert.strictEqual(state.player.health, 100, 'pickup healed player');

// restore stubs
Math.random = realRandom;
Date.now = realNow;

console.log('vampire AI tests passed');
