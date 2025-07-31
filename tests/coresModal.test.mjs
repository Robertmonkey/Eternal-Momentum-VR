import assert from 'assert';
import * as THREE from 'three';

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

const list = cores.children[3];
const firstBtn = list.children[0];
firstBtn.children[0].userData.onSelect();
assert(state.player.equippedAberrationCore, 'core equipped');

const unequip = cores.children.find(c => c.children && c.children[0]?.userData?.onSelect && c.children[0].userData.onSelect.toString().includes('null'));
unequip.children[0].userData.onSelect();
assert.strictEqual(state.player.equippedAberrationCore, null, 'core unequipped');

console.log('cores modal test passed');
