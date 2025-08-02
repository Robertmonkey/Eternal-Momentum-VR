const assert = require('assert');

(async () => {
  global.window = {
    innerWidth: 800,
    innerHeight: 600,
    devicePixelRatio: 1,
    startGame: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  const glStub = new Proxy({}, {
    get: (obj, prop) => {
      if (prop === 'canvas') return {};
      if (prop === 'getParameter') return () => 'WebGL 1.0';
      if (prop === 'getExtension') return () => null;
      if (prop === 'getSupportedExtensions') return () => [];
      if (prop === 'getShaderPrecisionFormat') return () => ({ precision: 0 });
      if (typeof prop === 'string' && prop.toUpperCase() === prop) return 0;
      return () => {};
    }
  });
  const ctx2d = {
    font: '',
    fillStyle: '',
    textBaseline: '',
    textAlign: '',
    measureText: () => ({ width: 100 }),
    fillText: () => {},
  };
  const canvasStub = () => ({
    width: 0,
    height: 0,
    style: {},
    addEventListener: () => {},
    getContext: (type) => (type === '2d' ? ctx2d : glStub),
  });
  global.document = {
    createElement: tag => (tag === 'canvas' ? canvasStub() : {}),
    createElementNS: (ns, tag) => (tag === 'canvas' ? canvasStub() : {}),
    body: { appendChild: () => {} },
  };
  global.localStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, val) { this._data[key] = String(val); },
    removeItem(key) { delete this._data[key]; },
  };
  global.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);

  const audio = await import('../modules/audio.js');
  audio.AudioManager.playSfx = () => {};
  audio.AudioManager.toggleMute = () => {};
  audio.AudioManager.updateButtonIcon = () => {};

  const scene = await import('../modules/scene.js');
  scene.initScene();

  const modalModule = await import('../modules/ModalManager.js');
  const { showModal, hideModal, getModalByName } = modalModule;
  const stateModule = await import('../modules/state.js');
  const { state } = stateModule;

  showModal('home');
  assert.strictEqual(state.activeModalId, 'home');
  assert.strictEqual(state.isPaused, true);

  showModal('settings');
  assert.strictEqual(state.activeModalId, 'settings');
  const homeModal = getModalByName('home');
  const settingsModal = getModalByName('settings');
  assert.strictEqual(homeModal.visible, false);
  assert.strictEqual(settingsModal.visible, true);

  hideModal();
  await new Promise(res => setTimeout(res, 0));
  assert.strictEqual(state.activeModalId, null);
  assert.strictEqual(state.isPaused, false);

  console.log('modalManager.test.js passed');
})();

