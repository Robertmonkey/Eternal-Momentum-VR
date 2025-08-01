import assert from 'assert';
import * as THREE from 'three';

// minimal DOM stubs for text sprite rendering
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

const { initModals, getModalObjects } = await import('../modules/ModalManager.js');
const camera = new THREE.PerspectiveCamera();
await initModals(camera);

function findButton(modal, label) {
  return modal.children.find(c => c.children && c.children[2]?.userData?.text === label);
}

const modals = Object.fromEntries(getModalObjects().filter(Boolean).map(m => [m.name, m]));

assert(findButton(modals.levelSelect, 'Close'), 'level select close text');
assert(findButton(modals.ascension, 'CLOSE'), 'ascension close text');
assert(findButton(modals.cores, 'CLOSE'), 'core close text');
assert(findButton(modals.orrery, 'CLOSE'), 'orrery close text');
assert(findButton(modals.lore, 'Close'), 'lore close text');
assert(findButton(modals.bossInfo, 'Close'), 'bossInfo close text');

console.log('modal text parity test passed');
