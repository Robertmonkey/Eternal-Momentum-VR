import assert from 'assert';
import * as THREE from 'three';

// minimal DOM stubs
global.window = {};
global.document = {
  createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 0 }), fillText: () => {} }) }),
  getElementById: () => null
};

const { initModals, getModalObjects } = await import('../modules/ModalManager.js');
const { state } = await import('../modules/state.js');
const camera = new THREE.PerspectiveCamera();
await initModals(camera);

const levelSelect = getModalObjects().find(m => m && m.name === 'levelSelect');
assert(levelSelect, 'levelSelect modal created');

const firstBtn = levelSelect.children.find(c => c.children && c.children[0]?.userData?.onSelect);
assert(firstBtn, 'stage button exists');
firstBtn.children[0].userData.onSelect();
assert.strictEqual(state.currentStage, 1, 'stage set to 1');
console.log('stage select modal test passed');
