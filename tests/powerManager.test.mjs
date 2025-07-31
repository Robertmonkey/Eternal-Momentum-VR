import assert from 'assert';
import * as THREE from 'three';

// Minimal DOM stubs
global.window = {};
function stubEl() {
  return {
    style: {},
    classList: { add() {}, remove() {} },
    setAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    querySelector: () => stubEl(),
    querySelectorAll: () => ({ forEach() {} }),
    appendChild() {}
  };
}
global.document = {
  getElementById: () => stubEl(),
  querySelector: () => stubEl(),
  querySelectorAll: () => ({ forEach() {} }),
  createElement: () => ({ getContext: () => ({}) })
};

const { state, resetGame } = await import('../modules/state.js');
const { gameHelpers } = await import('../modules/gameHelpers.js');

// Stub helpers used by powers
gameHelpers.play = () => {};
gameHelpers.addStatusEffect = () => {};
gameHelpers.pulseControllers = () => {};

const { useOffensivePower, useDefensivePower } = await import('../modules/PowerManager.js');

resetGame(false);

state.offensiveInventory[0] = 'missile';
state.defensiveInventory[0] = 'heal';
state.player.health = 50;

useDefensivePower();
assert.strictEqual(state.player.health, 80, 'heal power applied');

const effectsBefore = state.effects.length;
useOffensivePower();
assert.ok(state.effects.length > effectsBefore, 'offensive power spawned effect');

console.log('power manager tests passed');
