import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = { getElementById: () => null, createElement: () => ({ getContext: () => ({}) }) };

const { CenturionAI } = await import('../modules/agents/CenturionAI.js');

const boss = new CenturionAI(1);
const player = { position: boss.position.clone(), health: 10 };
boss.lastWall = Date.now() - 13000;
const helpers = { play:()=>{} };

boss.update(0.016, player, {}, helpers);
assert.ok(boss.activeBoxes.length === 1, 'box spawned');

boss.activeBoxes[0].start = Date.now() - 3000;
boss.update(0.1, player, {}, helpers);
assert.ok(player.health < 10, 'player damaged inside box');
console.log('centurion AI test passed');
