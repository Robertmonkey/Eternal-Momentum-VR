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

const { initModals, showHomeMenu, getModalObjects } = await import('../modules/ModalManager.js');
const camera = new THREE.PerspectiveCamera();
await initModals(camera);

showHomeMenu();
let home = getModalObjects().find(m => m && m.name === 'home');
assert(home && home.visible, 'home modal visible');

let startBtn = home.getObjectByName('startBtn');
let contBtn = home.getObjectByName('continueBtn');
let eraseBtn = home.getObjectByName('eraseBtn');

assert(startBtn.visible, 'start visible when no save');
assert(!contBtn.visible && !eraseBtn.visible, 'continue/erase hidden without save');

localStorage.setItem('eternalMomentumSave','{}');
showHomeMenu();
home = getModalObjects().find(m => m && m.name === 'home');
contBtn = home.getObjectByName('continueBtn');
eraseBtn = home.getObjectByName('eraseBtn');
startBtn = home.getObjectByName('startBtn');

assert(!startBtn.visible, 'start hidden when save exists');
assert(contBtn.visible && eraseBtn.visible, 'continue/erase visible when save exists');

console.log('home modal test passed');
