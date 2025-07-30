import assert from 'assert';

// Minimal DOM stubs to satisfy modules
global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { resetGame } = await import('../modules/state.js');
const { gameTick } = await import('../modules/gameLoop.js');

resetGame(false);

const result = gameTick();
assert.strictEqual(result, true, 'gameTick completes without canvas');

console.log('no canvas test passed');
