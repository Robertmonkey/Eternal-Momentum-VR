import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Sets up mocked environment and imports the launchVR function.
 * @returns {Promise<{launchVR: Function, showHud: Function, bodyAppend: Function, createButton: Function}>}
 */
async function setupLaunch() {
  const showHud = mock.fn();
  const bodyAppend = mock.fn();
  const createButton = mock.fn(() => ({}));
  const containerAppend = mock.fn();

  await mock.module('../modules/scene.js', {
    namedExports: {
      initScene: mock.fn(),
      getScene: () => ({}),
      getRenderer: () => ({
        domElement: {},
        setAnimationLoop: mock.fn(),
        xr: { enabled: false, addEventListener: mock.fn() }
      }),
      getCamera: () => ({})
    }
  });

  await mock.module('../modules/PlayerController.js', {
    namedExports: {
      initPlayerController: async () => {},
      updatePlayerController: mock.fn()
    }
  });

  await mock.module('../modules/UIManager.js', {
    namedExports: { initUI: mock.fn(), updateHud: mock.fn(), showHud, PIXELS_PER_UNIT: 1000 }
  });

    await mock.module('../modules/ModalManager.js', {
      namedExports: { initModals: mock.fn(), showModal: mock.fn() }
    });

  await mock.module('../modules/vrGameLoop.js', {
    namedExports: { vrGameLoop: mock.fn() }
  });

  await mock.module('../modules/telemetry.js', {
    namedExports: { Telemetry: { recordFrame: mock.fn() } }
  });

  const state = { isPaused: false, gameOver: false };
  await mock.module('../modules/state.js', {
    namedExports: { state, resetGame: mock.fn() }
  });

  await mock.module('../modules/ascension.js', {
    namedExports: { applyAllTalentEffects: mock.fn() }
  });

  await mock.module('../modules/audio.js', {
    namedExports: { AudioManager: { setup: mock.fn() } }
  });

  await mock.module('../modules/bosses.js', {
    namedExports: { bossData: [] }
  });

  await mock.module('../vendor/addons/webxr/XRButton.js', {
    namedExports: { XRButton: { createButton } }
  });

  await mock.module('../vendor/three.module.js', {
    namedExports: {}
  });

  global.document = {
    getElementById: () => ({ appendChild: containerAppend }),
    body: { appendChild: bodyAppend }
  };
  global.window = { addEventListener: mock.fn() };

  const { launchVR } = await import('../vrMain.js');
  return { launchVR, showHud, bodyAppend, createButton };
}

test('desktop fallback displays HUD without XR button', async (t) => {
  mock.reset();
  Object.defineProperty(global, 'navigator', { value: {}, writable: true, configurable: true });
  const { launchVR, showHud, bodyAppend, createButton } = await setupLaunch();

  const setNavigator = (val) => Object.defineProperty(global, 'navigator', { value: val, writable: true, configurable: true });

  await t.test('when navigator.xr is missing', async () => {
    showHud.mock.resetCalls();
    bodyAppend.mock.resetCalls();
    createButton.mock.resetCalls();
    setNavigator({});
    await launchVR();
    assert.equal(showHud.mock.calls.length, 1);
    assert.equal(bodyAppend.mock.calls.length, 0);
    assert.equal(createButton.mock.calls.length, 0);
  });

  await t.test('when isSessionSupported returns false', async () => {
    showHud.mock.resetCalls();
    bodyAppend.mock.resetCalls();
    createButton.mock.resetCalls();
    setNavigator({ xr: { isSessionSupported: async () => false } });
    await launchVR();
    assert.equal(showHud.mock.calls.length, 1);
    assert.equal(bodyAppend.mock.calls.length, 0);
    assert.equal(createButton.mock.calls.length, 0);
  });

  mock.reset();
  delete global.document;
  delete global.window;
  delete global.navigator;
});
