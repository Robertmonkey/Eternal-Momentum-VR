import assert from 'assert';
import * as THREE from 'three';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { state, resetGame } = await import('../modules/state.js');
const { moveTowards } = await import('../modules/movement3d.js');
const { uvToSpherePos } = await import('../modules/utils.js');

resetGame();

const radius = 1;
const startUv = { u: 0.5, v: 0 };
state.player.x = startUv.u * 2048;
state.player.y = startUv.v * 1024;
const avatar = uvToSpherePos(startUv.u, startUv.v, radius);
const target = uvToSpherePos(0.6, 0.2, radius);

const uv = moveTowards(avatar, target, 1, radius);
state.player.x = uv.u * 2048;
state.player.y = uv.v * 1024;

assert.notStrictEqual(state.player.x, startUv.u * 2048, 'state.x updated');
assert.notStrictEqual(state.player.y, startUv.v * 1024, 'state.y updated');

console.log('player state update tests passed');
