import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { state, resetGame } = await import('../modules/state.js');
const { ReflectorAI } = await import('../modules/agents/ReflectorAI.js');

resetGame(false);
state.player.health = 100;
const boss = new ReflectorAI(1);

// damage during idle reduces hp
boss.takeDamage(10, state.player, state);
assert.strictEqual(boss.health, 110, 'idle damage reduces hp');

// damage while reflecting heals boss and hurts player
boss.phase = 'moving';
boss.reflecting = true;
boss.takeDamage(10, state.player, state);
assert.strictEqual(boss.health, 120, 'heals when reflecting');
assert.strictEqual(state.player.health, 90, 'player damaged when reflecting');

console.log('reflector AI tests passed');
