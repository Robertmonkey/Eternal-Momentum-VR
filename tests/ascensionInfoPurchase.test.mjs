import assert from 'assert';
import * as THREE from 'three';

function stubEl(){
  return {
    getContext: () => ({
      measureText: () => ({ width: 0 }),
      fillText(text){ this.lastText = text; },
      clearRect: () => {}
    })
  };
}

global.window = {};
global.document = { createElement: () => stubEl(), getElementById: () => null };
const store = {};
global.localStorage = { getItem: k => store[k] || null, setItem: (k,v)=>{store[k]=v;}, removeItem:k=>{delete store[k];} };

const { initModals, getModalObjects } = await import('../modules/ModalManager.js');
const { state } = await import('../modules/state.js');
state.player.ascensionPoints = 5;
const cam = new THREE.PerspectiveCamera();
await initModals(cam);

const asc = getModalObjects().find(m => m && m.name === 'ascension');
assert(asc, 'ascension modal exists');

const infoGroup = asc.children.find(c => c.children && c.children.length===3);
const costCtx = infoGroup.children[2].userData.ctx;
const before = costCtx.lastText;

const grid = asc.children.find(g => g.children && g.children.some(n => n.children && n.children[0]?.userData?.onSelect));
const nodes = grid.children.filter(n => n.children && n.children[0]?.userData?.onSelect);
assert(nodes.length > 0, 'nodes found');

nodes[0].children[0].userData.onSelect();
nodes[0].children[0].userData.onHover();
assert.notStrictEqual(costCtx.lastText, before, 'info text updated after purchase');
assert.ok(state.player.purchasedTalents.has('core-nexus'), 'talent purchased');
console.log('ascension info purchase test passed');
