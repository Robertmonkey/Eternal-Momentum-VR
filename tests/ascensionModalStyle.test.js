import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

async function setup() {
  mock.reset();
  global.requestAnimationFrame = (fn) => fn();
  const scene = { children: [], add(obj) { this.children.push(obj); } };
  await mock.module('../modules/scene.js', {
    namedExports: {
      getScene: () => scene,
      getCamera: () => ({ position: new THREE.Vector3(), rotation: new THREE.Euler(), quaternion: new THREE.Quaternion() }),
      getRenderer: () => ({}),
      getPrimaryController: () => ({})
    }
  });
  const state = {
    activeModalId: null,
    isPaused: false,
    uiInteractionCooldownUntil: 0,
    player: { ascensionPoints: 0, purchasedTalents: new Map(), unlockedPowers: new Set() }
  };
  await mock.module('../modules/state.js', { namedExports: { state, savePlayerState: mock.fn(), resetGame: mock.fn() } });
  await mock.module('../modules/PlayerController.js', { namedExports: { refreshPrimaryController: mock.fn(), resetInputFlags: mock.fn() } });
  await mock.module('../modules/audio.js', { namedExports: { AudioManager: { playSfx: mock.fn() } } });
  await mock.module('../modules/gameHelpers.js', { namedExports: { gameHelpers: {}, initGameHelpers: () => {} } });
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
      updateTextSprite: (obj, newText) => { obj.userData.text = newText; },
      getBgTexture: () => null,
      showUnlockNotification: () => {},
      showBossBanner: () => {},
      updateHud: () => {},
      showHud: () => {},
      hideHud: () => {},
      PIXELS_PER_UNIT: 1000
    }
  });
  const { initModals, showModal, getModalObjects } = await import('../modules/ModalManager.js');
  return { initModals, showModal, getModalObjects };
}

test('ascension modal uses rounded corners and cyan glow', async () => {
  const { initModals, showModal, getModalObjects } = await setup();
  initModals();
  showModal('ascension');
  const ascensionModal = getModalObjects().find(m => m.name === 'modal_ascension');
  assert.ok(ascensionModal, 'ascension modal should exist');
  assert.ok(ascensionModal.userData.cornerRadius > 0, 'modal should have rounded corners');
  const glow = ascensionModal.children.find(c => c.name === 'ascension_modal_glow');
  assert.ok(glow, 'glow plane should exist');
  assert.ok(glow.geometry.parameters.width > ascensionModal.userData.width, 'glow should extend past modal width');
  assert.ok(glow.geometry.parameters.height > ascensionModal.userData.height, 'glow should extend past modal height');
});
