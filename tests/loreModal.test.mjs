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
const lines = lore.getObjectByName('storyLines');
assert(lines && lines.children.length > 10, 'story lines created');
const scroll = lore.getObjectByName('scrollBar');
assert(scroll, 'scroll bar visible');

console.log('lore modal test passed');
