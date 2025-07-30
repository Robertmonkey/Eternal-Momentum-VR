import assert from 'assert';
import * as THREE from 'three';

global.window = { gameHelpers: {} };
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { state, resetGame } = await import('../modules/state.js');
const { handleCoreOnFatalDamage } = await import('../modules/cores.js');
const { uvToSpherePos, spherePosToUv } = await import('../modules/utils.js');

resetGame(false);
state.player.equippedAberrationCore = 'epoch_ender';
const epochState = state.player.talent_states.core_states.epoch_ender;
epochState.history.unshift({ x: 512, y: 256, health: 50 });
state.player.position.copy(uvToSpherePos(0.5, 0, 1));
state.player.health = 10;

const result = handleCoreOnFatalDamage(null, { play: () => {} });

const { u, v } = spherePosToUv(state.player.position, 1);
assert(result === true, 'rewind returned true');
assert(
  Math.abs(u - 0.75) < 1e-6 && Math.abs(v - 0.25) < 1e-6,
  'player position rewound'
);
assert.strictEqual(state.player.health, 50, 'player health restored');

console.log('epoch ender rewind test passed');

