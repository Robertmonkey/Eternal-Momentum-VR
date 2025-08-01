import assert from 'assert';
import * as THREE from 'three';

global.window = {};
global.document = {
  createElement: () => ({
    getContext: () => ({
      measureText: () => ({ width: 0 }),
      fillText: () => {},
      clearRect: () => {}
    })
  }),
  getElementById: () => null
};
const store = {};
global.localStorage = {
  getItem: k => store[k] || null,
  setItem: (k,v) => { store[k] = v; },
  removeItem: k => { delete store[k]; }
};

const { initModals, getModalObjects } = await import('../modules/ModalManager.js');
const { state } = await import('../modules/state.js');

state.player.highestStageBeaten = 30;
const camera = new THREE.PerspectiveCamera();
await initModals(camera);

const orrery = getModalObjects().find(m => m && m.name === 'orrery');
assert(orrery, 'orrery modal created');
orrery.userData.render();

const bossList = orrery.getObjectByName('bossList');
const firstRow = bossList.children[0];
firstRow.children[0].children[0].userData.onSelect();
assert.strictEqual(orrery.userData.selectedBosses.length, 1, 'boss selected');

const startBtn = orrery.userData.startBtn;
startBtn.children[0].userData.onSelect();
assert(state.arenaMode, 'arena mode active');
assert.deepStrictEqual(state.customOrreryBosses, orrery.userData.selectedBosses, 'boss list applied');

console.log('orrery modal test passed');
