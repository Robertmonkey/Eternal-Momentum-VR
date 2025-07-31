import assert from 'assert';
import * as THREE from 'three';

// minimal DOM stubs
global.window = {};
global.document = {
  createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 0 }), fillText: () => {}, clearRect: () => {} }) }),
  getElementById: () => null
};

const { initModals, showConfirm, getModalObjects } = await import('../modules/ModalManager.js');
const camera = new THREE.PerspectiveCamera();
await initModals(camera);

let confirmed = false;
showConfirm('Erase?', 'Really erase?', () => { confirmed = true; });
const confirmModal = getModalObjects().find(m => m && m.name === 'confirm');
assert(confirmModal && confirmModal.visible, 'confirm modal visible');
// simulate pressing confirm button
const yesGroup = confirmModal.children.find(c => c.children && c.children[0]?.userData?.onSelect);
yesGroup.children[0].userData.onSelect();
assert(confirmed, 'confirm callback triggered');
console.log('confirm modal test passed');
