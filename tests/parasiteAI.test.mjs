import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { ParasiteAI } = await import('../modules/agents/ParasiteAI.js');

const boss = new ParasiteAI(1);
const player = { position: boss.position.clone(), infected: false };

boss.update(0.016, player, { enemies: [] }, { addStatusEffect:()=>{} });
assert.ok(player.infected, 'player infected');
console.log('parasite AI test passed');
