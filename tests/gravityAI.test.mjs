import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { state, resetGame } = await import('../modules/state.js');
const { GravityAI } = await import('../modules/agents/GravityAI.js');
const { uvToSpherePos } = await import('../modules/utils.js');

resetGame(false);

const boss = new GravityAI(1);
boss.position.copy(uvToSpherePos(0.5, 0.5, 1));

const playerObj = { r: 10, position: uvToSpherePos(0.5, 0, 1) };

const before = playerObj.position.clone();

boss.update(1, 2048, 1024, playerObj, state);

assert.ok(!playerObj.position.equals(before), 'player moved by gravity');

console.log('gravity AI test passed');
