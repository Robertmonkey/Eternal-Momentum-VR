import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

async function setup() {
  const controller = new THREE.Object3D();
  const camera = new THREE.Object3D();
  const makeCanvas = () => {
    const ctx = {
      font: '',
      shadowColor: '',
      shadowBlur: 0,
      fillStyle: '',
      textBaseline: '',
      textAlign: '',
      measureText: () => ({ width: 0 }),
      fillText: () => {},
      clearRect: () => {},
    };
    return { getContext: () => ctx, width: 0, height: 0 };
  };
  global.document = {
    createElement: () => makeCanvas(),
    getElementById: () => null,
    body: { appendChild: () => {} }
  };
  global.window = { devicePixelRatio: 1 };

  await mock.module('../modules/scene.js', {
    namedExports: {
      getCamera: () => camera,
      getPrimaryController: () => controller,
      getRenderer: () => ({ domElement: { style: {} } }),
      getScene: () => new THREE.Scene(),
      getArena: () => ({})
    }
  });

  const ui = await import(`../modules/UIManager.js?test=${Math.random()}`);
  return { controller, camera, ...ui };
}

test('HUD elements ignore controller raycasts', async () => {
  mock.reset();
  const { initUI, getUIRoot } = await setup();
  initUI();
  const uiRoot = getUIRoot();
  const hud = uiRoot.children.find(c => c.name === 'hudContainer');
  hud.position.set(0, 0, -1);
  hud.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1));
  const hits = raycaster.intersectObjects([hud], true);
  assert.equal(hits.length, 0);
  delete global.document;
  delete global.window;
  mock.reset();
});
