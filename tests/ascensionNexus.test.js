import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

// Utility to set up minimal environment for ModalManager
async function setup() {
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
    namedExports: { gameHelpers: {} }
  });

  await mock.module('../modules/UIManager.js', {
    namedExports: {
      holoMaterial: (color = 0x1e1e2f, opacity = 0.85) => ({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 1,
        transparent: true,
        opacity
      }),
      createTextSprite: () => {
        const obj = new THREE.Object3D();
        obj.material = { color: new THREE.Color(0xffffff) };
        return obj;
      },
      updateTextSprite: () => {},
      getBgTexture: () => null,
      showUnlockNotification: () => {}
    }
  });

  const { initModals, showModal } = await import('../modules/ModalManager.js');
  return { scene, initModals, showModal };
}

test('nexus talents use green border color', async () => {
  const { scene, initModals, showModal } = await setup();
  initModals();
  showModal('ascension');
  const modalGroup = scene.children[0];
  const ascensionModal = modalGroup.children.find(c => c.name === 'modal_ascension');
  assert.ok(ascensionModal);
  const grid = ascensionModal.children.find(c => c.position && c.position.y === -0.1);
  const nexusButton = grid.children.find(c => c.userData && c.userData.talentId === 'core-nexus');
  assert.ok(nexusButton, 'core nexus button should exist');
  const border = nexusButton.children[1];
  assert.equal(border.material.color.getHex(), 0x00ff00);
});
