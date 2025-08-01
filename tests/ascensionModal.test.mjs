import assert from 'assert';
import * as THREE from 'three';

// stub DOM and storage
global.window = { location: { reload(){ this.reloaded = true; } } };
global.document = {
  createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 0 }), fillText: () => {}, clearRect: () => {} }) }),
  getElementById: () => null
};
const store = { eternalMomentumSave: 'yes' };
global.localStorage = {
  getItem: k => store[k] || null,
  setItem: (k,v) => { store[k] = v; },
  removeItem: k => { delete store[k]; }
};

const { initModals, getModalObjects } = await import('../modules/ModalManager.js');
const { state } = await import('../modules/state.js');

state.player.ascensionPoints = 5;
const camera = new THREE.PerspectiveCamera();
await initModals(camera);

const asc = getModalObjects().find(m => m && m.name === 'ascension');
assert(asc, 'ascension modal created');

const erase = asc.children.find(c => c.children && c.children[0]?.userData?.onSelect && c.children[0].userData.onSelect.toString().includes('showConfirm'));
erase.children[0].userData.onSelect();

const confirm = getModalObjects().find(m => m && m.name === 'confirm');
const yes = confirm.children.find(c => c.children && c.children[0]?.userData?.onSelect);
yes.children[0].userData.onSelect();

assert.strictEqual(store.eternalMomentumSave, undefined, 'save cleared');
assert.ok(global.window.location.reloaded, 'page reloaded');

console.log('ascension modal test passed');
