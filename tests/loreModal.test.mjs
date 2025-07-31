import assert from 'assert';
import * as THREE from 'three';

global.window = {};
global.document = {
  createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 0 }), fillText: () => {}, clearRect: () => {} }) }),
  getElementById: () => null
};

const { initModals, showModal, getModalObjects } = await import('../modules/ModalManager.js');
const camera = new THREE.PerspectiveCamera();
await initModals(camera);

showModal('lore');
const lore = getModalObjects().find(m => m && m.name === 'lore');
assert(lore.visible, 'lore modal visible');

console.log('lore modal test passed');
