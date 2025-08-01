import assert from 'assert';
import * as THREE from 'three';
import fs from 'fs';

// stub DOM
global.window = {};
global.document = {
  createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 0 }), fillText: () => {}, clearRect: () => {} }) }),
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

const camera = new THREE.PerspectiveCamera();
await initModals(camera);

const cores = getModalObjects().find(m => m && m.name === 'cores');
assert(cores, 'cores modal created');

// verify header and label text are correct in source
const src = fs.readFileSync('./modules/ModalManager.js', 'utf8');
assert(src.includes("ABERRATION CORE ATTUNEMENT"), 'heading text match');
assert(src.includes("CURRENTLY ATTUNED"), 'label text match');

// list of core buttons stored under coreList
const list = cores.getObjectByName('coreList');
const firstBtn = list.children[0];
firstBtn.children[1].userData.onSelect();
assert(state.player.equippedAberrationCore, 'core equipped');

const unequip = cores.getObjectByName('unequipBtn');
unequip.children[1].userData.onSelect();
assert.strictEqual(state.player.equippedAberrationCore, null, 'core unequipped');

console.log('cores modal test passed');
