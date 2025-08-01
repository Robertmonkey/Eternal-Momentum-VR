import assert from 'assert';
import * as THREE from 'three';

// minimal DOM stubs
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
const { state } = await import('../modules/state.js');
const camera = new THREE.PerspectiveCamera();
await initModals(camera);

const levelSelect = getModalObjects().find(m => m && m.name === 'levelSelect');
assert(levelSelect, 'levelSelect modal created');

const scrollBar = levelSelect.getObjectByName('scrollBar');
assert(scrollBar, 'scroll bar created');
const up = scrollBar.getObjectByName('scrollUp');
const down = scrollBar.getObjectByName('scrollDown');
const list = levelSelect.getObjectByName('stageList');
const initialY = list.position.y;
down.children[1].userData.onSelect();
assert(list.position.y < initialY, 'list scrolled down');
up.children[1].userData.onSelect();
assert.strictEqual(list.position.y, initialY, 'list scrolled back up');

const stageRow = levelSelect.getObjectByName('stage1');
assert(stageRow, 'stage row exists');
// button structure: [border, bg, label]. onSelect is attached to the bg mesh
stageRow.children[0].children[1].userData.onSelect();
assert.strictEqual(state.currentStage, 1, 'stage set to 1');

// mechanics info button
stageRow.children[1].children[1].userData.onSelect();
const bossInfo = getModalObjects().find(m => m && m.name === 'bossInfo');
assert(bossInfo.visible, 'boss info visible');
console.log('stage select modal test passed');
