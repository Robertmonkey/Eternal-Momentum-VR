import assert from 'assert';
import * as THREE from 'three';

// minimal DOM stubs
global.window = { gameHelpers: {}, navigator: {} };
global.navigator = { xr: true };
function stubEl() {
  return {
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    querySelector: () => stubEl(),
    querySelectorAll: () => ({ forEach() {} }),
    appendChild() {},
    innerHTML: '',
    getContext: () => ({}),
    object3D: { scale: { x: 0, y: 0, z: 0 }, setAttribute() {} }
  };
}
global.document = {
  getElementById: () => stubEl(),
  querySelector: () => stubEl(),
  querySelectorAll: () => ({ forEach() {} }),
  createElement: () => ({ getContext: () => ({}) })
};

const { state, resetGame } = await import('../modules/state.js');
const { useCoreActive, applyCorePassives } = await import('../modules/CoreManager.js');
const { gameHelpers } = await import('../modules/gameHelpers.js');
const utils = await import('../modules/utils.js');

gameHelpers.play = () => {};
gameHelpers.addStatusEffect = () => {};
global.spherePosToUv = utils.spherePosToUv;

resetGame(false);

state.player.equippedAberrationCore = 'juggernaut';
state.mousePosition = new THREE.Vector3(1, 0, 0);

const beforeCount = state.effects.length;
useCoreActive(gameHelpers);
assert(state.player.talent_states.core_states.juggernaut.cooldownUntil > Date.now(), 'cooldown set');
assert(state.effects.length > beforeCount, 'effect spawned');

applyCorePassives(gameHelpers);
assert.ok(true, 'passives executed');

console.log('core manager tests passed');
