import assert from 'assert';

// stub DOM and localStorage
global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};
const store = {};
global.localStorage = {
  getItem: k => store[k] || null,
  setItem: (k,v) => { store[k] = v; }
};

test();
async function test(){
  const { state, savePlayerState, loadPlayerState } = await import('../modules/state.js');
  state.settings.handedness = 'left';
  state.settings.musicVolume = 80;
  state.settings.sfxVolume = 60;
  savePlayerState();
  state.settings.handedness = 'right';
  state.settings.musicVolume = 10;
  state.settings.sfxVolume = 10;
  loadPlayerState();
  assert.strictEqual(state.settings.handedness, 'left');
  assert.strictEqual(state.settings.musicVolume, 80);
  assert.strictEqual(state.settings.sfxVolume, 60);
  console.log('settings save test passed');
}
