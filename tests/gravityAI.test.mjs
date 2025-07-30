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

const playerObj = { x: 1024, y: 512, r: 10, position: uvToSpherePos(0.5, 0, 1) };
const player2d = { x: 1024, y: 512 };

const beforeX = playerObj.x;

boss.update(1, player2d, 2048, 1024, playerObj, state);

assert.notStrictEqual(playerObj.x, beforeX, 'player moved by gravity');

console.log('gravity AI test passed');
