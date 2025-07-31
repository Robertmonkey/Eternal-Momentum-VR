import assert from 'assert';

// stub minimal DOM
global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) }),
  querySelectorAll: () => ({ forEach() {} })
};

const { state, resetGame } = await import('../modules/state.js');
// SplitterAI imports spawnEnemy from gameLoop which relies on document; ensure stubbed before import
const { SplitterAI } = await import('../modules/agents/SplitterAI.js');

// make timeouts execute instantly
global.setTimeout = (fn) => { fn(); return 0; };

resetGame(false);
state.enemies = [];

const boss = new SplitterAI(1);
boss.die({ play: () => {}, spawnParticles: () => {} }, state);

assert.strictEqual(state.enemies.length, 12, 'die spawns two waves of minions');

console.log('splitter AI test passed');
