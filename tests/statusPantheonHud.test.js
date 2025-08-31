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

test('status effects and pantheon buffs render icons', async () => {
  mock.reset();
  const { state, initUI, updateHud, getUIRoot } = await setup();
  const now = Date.now();
  state.player.statusEffects = [
    { name: 'Berserk', emoji: '\uD83D\uDC49', startTime: now - 1000, endTime: now + 1000 }
  ];
  state.player.activePantheonBuffs = [
    { coreId: 'gravity', startTime: now - 1000, endTime: now + 1000 }
  ];
  initUI();
  updateHud();
  const hud = getUIRoot().children.find(c => c.name === 'hudContainer');
  const statusGroup = hud.children.find(c => c.name === 'statusGroup');
  const pantheonGroup = hud.children.find(c => c.name === 'pantheonGroup');
  assert.equal(statusGroup.children.length, 1);
  assert.equal(pantheonGroup.children.length, 1);
  delete global.document;
  delete global.window;
  mock.reset();
});
