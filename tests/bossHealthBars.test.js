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
  const { state } = await import('../modules/state.js');
  const ui = await import(`../modules/UIManager.js?test=${Math.random()}`);
  return { controller, state, ...ui };
}

test('sentinel pair shows single boss bar', async () => {
  mock.reset();
  const { controller, state, initUI, updateHud } = await setup();
  state.enemies = [
    { boss: true, id: 'sentinel_pair', name: 'Sentinel Pair', health: 200, maxHP: 400, instanceId: 1 },
    { boss: true, id: 'sentinel_pair', name: 'Sentinel Pair', health: 200, maxHP: 400, instanceId: 2 },
  ];
  initUI();
  updateHud();
  const bossContainer = controller.children.find(c => c.name === 'bossContainer');
  assert.equal(bossContainer.children.length, 1);
  delete global.document;
  delete global.window;
  mock.reset();
});

test('fractal horror shows single boss bar', async () => {
  mock.reset();
  const { controller, state, initUI, updateHud } = await setup();
  state.fractalHorrorSharedHp = 1000;
  state.enemies = [
    { boss: true, id: 'fractal_horror', name: 'Fractal Horror', health: 1000, maxHP: 1000, instanceId: 1 },
    { boss: true, id: 'fractal_horror', name: 'Fractal Horror', health: 1000, maxHP: 1000, instanceId: 2 },
  ];
  initUI();
  updateHud();
  const bossContainer = controller.children.find(c => c.name === 'bossContainer');
  assert.equal(bossContainer.children.length, 1);
  delete global.document;
  delete global.window;
  mock.reset();
});
