import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

async function setup(purchasedTalents) {
  mock.reset();
  global.requestAnimationFrame = (fn) => fn();
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
      purchasedTalents,
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
      hideHud: () => {}
    }
  });

  const { initModals, showModal, getModalObjects } = await import('../modules/ModalManager.js');
  return { scene, initModals, showModal, getModalObjects };
}

// Ensure the talent grid renders even if purchasedTalents comes from a legacy array save.
test('ascension modal shows core nexus with array purchasedTalents', async () => {
  const { initModals, showModal, getModalObjects } = await setup([]);
  initModals();
  showModal('ascension');
  const ascensionModal = getModalObjects().find(m => m.name === 'modal_ascension');
  assert.ok(ascensionModal);
  const grid = ascensionModal.children.find(c => c.name === 'ascension_grid');
  const nexusButton = grid.children.find(c => c.userData && c.userData.talentId === 'core-nexus');
  assert.ok(nexusButton, 'core nexus button should exist');
});

// Also handle legacy saves where purchasedTalents was a plain object.
test('ascension modal shows core nexus with object purchasedTalents', async () => {
  const { initModals, showModal, getModalObjects } = await setup({});
  initModals();
  showModal('ascension');
  const ascensionModal = getModalObjects().find(m => m.name === 'modal_ascension');
  assert.ok(ascensionModal);
  const grid = ascensionModal.children.find(c => c.name === 'ascension_grid');
  const nexusButton = grid.children.find(c => c.userData && c.userData.talentId === 'core-nexus');
  assert.ok(nexusButton, 'core nexus button should exist');
});
