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
state.player.position.copy(uvToSpherePos(startUv.u, startUv.v, radius));
const avatar = state.player.position.clone();
const target = uvToSpherePos(0.6, 0.2, radius);

moveTowards(avatar, target, 1, radius);
state.player.position.copy(avatar);

const startPos = uvToSpherePos(startUv.u, startUv.v, radius);
assert(!state.player.position.equals(startPos), 'state.position updated');

console.log('player state update tests passed');
