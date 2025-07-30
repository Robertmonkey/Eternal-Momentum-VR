import assert from 'assert';
import * as THREE from 'three';

// Minimal DOM stubs required by imported modules
global.window = {};
global.document = {
  createElement: () => ({
    getContext: () => ({
      measureText: () => ({ width: 0 }),
      fillText: () => {}
    })
  }),
  getElementById: () => null
};

// stub scene.getCamera using dependency injection
const camera = new THREE.PerspectiveCamera();
const { initModals, showModal, hideModal, getModalObjects } = await import('../modules/ModalManager.js');

// inject camera
await initModals(camera);

showModal('ascension');
let modal = getModalObjects().filter(Boolean).find(m=>m.name==='ascension');
assert(modal && modal.visible, 'ascension modal visible');

hideModal('ascension');
assert(!modal.visible, 'ascension modal hidden');

console.log('modal visibility test passed');
