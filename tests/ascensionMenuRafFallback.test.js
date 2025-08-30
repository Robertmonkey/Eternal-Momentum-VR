import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

// Replicate the minimal environment used in other ascension tests but omit
// requestAnimationFrame so ModalManager must rely on its internal RAF
// fallback. This guards against a blank Ascension menu on platforms that do
// not provide the API (e.g. some headless or legacy WebXR runtimes).

async function setup() {
  mock.reset();
  delete global.requestAnimationFrame;
  delete global.cancelAnimationFrame;

  const scene = { children: [], add(obj) { this.children.push(obj); } };
  await mock.module('../modules/scene.js', {
    namedExports: {
      getScene: () => scene,
      getCamera: () => ({
        position: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        quaternion: new THREE.Quaternion()
      }),
      getRenderer: () => ({}),
      getPrimaryController: () => ({})
    }
  });

  const state = {
    activeModalId: null,
    isPaused: false,
    uiInteractionCooldownUntil: 0,
    player: {
      ascensionPoints: 0,
      purchasedTalents: new Map(),
      unlockedPowers: new Set()
    }
  };

  await mock.module('../modules/state.js', {
    namedExports: { state, savePlayerState: mock.fn(), resetGame: mock.fn() }
  });

  await mock.module('../modules/PlayerController.js', {
    namedExports: { refreshPrimaryController: mock.fn(), resetInputFlags: mock.fn() }
  });

  await mock.module('../modules/audio.js', {
    namedExports: { AudioManager: { playSfx: mock.fn() } }
  });

  await mock.module('../modules/gameHelpers.js', {
    namedExports: { gameHelpers: {}, initGameHelpers: () => {} }
  });

  await mock.module('../modules/UIManager.js', {
    namedExports: {
      holoMaterial: (color = 0x1e1e2f, opacity = 0.85) => ({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 1,
        transparent: true,
        opacity,
        dispose: () => {}
      }),
      createTextSprite: (text = '') => {
        const obj = new THREE.Object3D();
        obj.material = { color: new THREE.Color(0xffffff), opacity: 1, dispose: () => {} };
        obj.userData = { text };
        return obj;
      },
      updateTextSprite: (obj, newText) => {
        obj.userData.text = newText;
      },
      getBgTexture: () => null,
      showUnlockNotification: () => {},
      showBossBanner: () => {},
      updateHud: () => {},
      showHud: () => {},
      hideHud: () => {},
      PIXELS_PER_UNIT: 1000
    }
  });

  const { showModal, getModalObjects } = await import('../modules/ModalManager.js');
  return { showModal, getModalObjects };
}

test('ascension modal renders without requestAnimationFrame', async () => {
  const { showModal, getModalObjects } = await setup();
  showModal('ascension');
  const modal = getModalObjects().find(m => m.name === 'modal_ascension');
  assert.ok(modal, 'ascension modal should exist');
  const grid = modal.children.find(c => c.name === 'ascension_grid');
  assert.ok(grid, 'talent grid should exist');
  assert.ok(grid.children.length > 0, 'talent grid should populate immediately');
});
