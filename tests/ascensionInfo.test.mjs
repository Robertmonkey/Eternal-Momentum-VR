import assert from 'assert';
import * as THREE from 'three';

// stub DOM and storage
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
global.localStorage = { getItem: k => store[k] || null, setItem: (k,v)=>{store[k]=v;}, removeItem: k=>{delete store[k];} };

const { initModals, getModalObjects } = await import('../modules/ModalManager.js');
const { state } = await import('../modules/state.js');
state.player.ascensionPoints = 5;
const camera = new THREE.PerspectiveCamera();
await initModals(camera);

const asc = getModalObjects().find(m => m && m.name === 'ascension');
assert(asc, 'ascension modal created');

let infoGroup = asc.children.find(c => c.children && c.children.length===3 && c.children[0].userData?.ctx);
assert(infoGroup, 'info group exists');
const ctx = infoGroup.children[0].userData.ctx;
const beforeText = ctx.lastText;
const grid = asc.children.find(g => g.children && g.children.some(n => n.children && n.children[0]?.userData?.onHover));
const nodes = grid.children.filter(n => n.children && n.children[0]?.userData?.onHover);
assert(nodes.length > 1, 'nodes found');
nodes[1].children[0].userData.onHover();
assert.notStrictEqual(ctx.lastText, beforeText, 'info text updated');
console.log('ascension info test passed');
