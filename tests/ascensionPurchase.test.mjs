import assert from 'assert';
import * as THREE from 'three';

// stub DOM and storage
global.window = {};
function stubEl(){
  return {
    classList: { add() {}, remove() {}, toggle() {} },
    style: {},
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    object3D: { scale: { x: 0, y: 0, z: 0 } },
    children: [],
    getContext: () => ({ measureText: () => ({ width: 0 }), fillText: () => {}, clearRect: () => {} })
  };
}
global.document = {
  createElement: () => stubEl(),
  getElementById: () => stubEl(),
  querySelectorAll: () => ({ forEach() {} })
};
const store = {};
global.localStorage = { getItem: k => store[k] || null, setItem: (k,v)=>{store[k]=v;}, removeItem:k=>{delete store[k];} };

const { initModals, getModalObjects } = await import('../modules/ModalManager.js');
const { state } = await import('../modules/state.js');

state.player.ascensionPoints = 5;
const camera = new THREE.PerspectiveCamera();
await initModals(camera);

const asc = getModalObjects().find(m => m && m.name === 'ascension');
assert(asc, 'ascension modal created');

const grid = asc.children.find(g => g.children && g.children.some(c => c.children && c.children[0]?.userData?.onSelect));
const node = grid && grid.children.find(c => c.children && c.children[0]?.userData?.onSelect);
assert(node, 'talent node exists');
node.children[0].userData.onSelect();

assert.ok(state.player.purchasedTalents.size >= 1, 'talent purchased');
console.log('ascension purchase test passed');
