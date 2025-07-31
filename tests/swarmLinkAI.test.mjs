import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { SwarmLinkAI } = await import('../modules/agents/SwarmLinkAI.js');

const boss = new SwarmLinkAI(1);
const player = { position: new THREE.Vector3(0, 1, 0) };
const state = { effects: [] };

boss.minions.forEach(m => (m.lastShot = Date.now() - 5000));

boss.update(0.016, player, state);

assert.ok(state.effects.length > 0, 'update spawns bullets');

console.log('swarm AI test passed');
