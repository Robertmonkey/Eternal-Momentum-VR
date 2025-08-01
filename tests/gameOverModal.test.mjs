import assert from 'assert';
import * as THREE from 'three';

// minimal DOM stubs
const canvasStub = {
  getContext: () => ({
    measureText: () => ({ width: 0 }),
    fillText: () => {},
    clearRect: () => {}
  })
};

global.window = { gameHelpers: {} };
global.document = {
  body: {},
  createElement: () => canvasStub,
  getElementById: (id) => {
    if (id === 'levelSelectModal') return { classList: { add: ()=>{}, remove: ()=>{} } };
    return null;
  }
};
global.html2canvas = async () => canvasStub;

const { state, resetGame } = await import('../modules/state.js');
const { initModals, getModalObjects, showModal } = await import('../modules/ModalManager.js');

const camera = new THREE.PerspectiveCamera();
await initModals(camera);

showModal('gameOver');
let gameOver = getModalObjects().filter(Boolean).find(m => m.name === 'gameOver');
assert(gameOver.visible, 'gameOver modal visible');

// find restart button
// onSelect is attached to the background mesh (child index 1)
const restartGroup = gameOver.children.find(c => c.children && c.children[1]?.userData?.onSelect);
state.player.health = 50;
restartGroup.children[1].userData.onSelect();

assert.strictEqual(state.player.health, state.player.maxHealth, 'player reset');
assert(!gameOver.visible, 'gameOver hidden after restart');

// test ascension button opens ascension modal
showModal('gameOver');
// buttons store their handler on the background mesh (index 1)
const ascGroup = gameOver.children.filter(c => c.children && c.children[1]?.userData?.onSelect)[1];
ascGroup.children[1].userData.onSelect();
const ascension = getModalObjects().filter(Boolean).find(m => m.name === 'ascension');
assert(ascension.visible, 'ascension modal visible');

console.log('gameOver modal test passed');
