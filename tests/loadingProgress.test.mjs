import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

const progressFill = { style: { width: '0%' } };
const statusText = { textContent: '' };

global.window = { gameHelpers: {}, addEventListener: () => {} };
global.document = {
  body: {},
  getElementById: (id) => {
    if (id === 'loadingProgressFill') return progressFill;
    if (id === 'loadingStatusText') return statusText;
    return null;
  },
  createElement: () => ({ getContext: () => ({}) })
};

THREE.LoadingManager.prototype.itemStart = function(){
  if (this.onProgress) this.onProgress('file', 1, 1);
};
THREE.LoadingManager.prototype.itemEnd = function(){
  if (this.onLoad) this.onLoad();
};
THREE.TextureLoader.prototype.load = function(_url, onLoad){
  if (onLoad) onLoad({});
  this.manager.itemStart('file');
  this.manager.itemEnd('file');
};

const { preloadAssets } = await import('../app.js');
await preloadAssets();

assert.strictEqual(progressFill.style.width, '100%', 'progress reaches 100%');
assert.strictEqual(statusText.textContent, 'Loading Complete');

console.log('loading progress test passed');
