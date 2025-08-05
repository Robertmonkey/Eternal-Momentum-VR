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
        obj.material = { color: new THREE.Color(0xffffff), dispose: () => {} };
        obj.userData = { text };
        return obj;
      },
      updateTextSprite: (obj, newText) => {
        obj.userData.text = newText;
      },
      getBgTexture: () => null,
      showUnlockNotification: () => {},
      showBossBanner: () => {}
    }
  });

  const { initModals, showModal, getModalObjects } = await import('../modules/ModalManager.js');
  return { scene, initModals, showModal, getModalObjects, state };
}

test('nexus talents use green border color', async () => {
  const { initModals, showModal, getModalObjects } = await setup();
  initModals();
  showModal('ascension');
  const ascensionModal = getModalObjects().find(m => m.name === 'modal_ascension');
  assert.ok(ascensionModal);
  const grid = ascensionModal.children.find(c => c.name === 'ascension_grid');
  const nexusButton = grid.children.find(c => c.userData && c.userData.talentId === 'core-nexus');
  assert.ok(nexusButton, 'core nexus button should exist');
  const border = nexusButton.children[1];
  assert.equal(border.material.color.getHex(), 0x00ff00);
});

test('ascension modal buttons mirror 2D colors', async () => {
  const { initModals, showModal, getModalObjects } = await setup();
  initModals();
  showModal('ascension');
  const ascensionModal = getModalObjects().find(m => m.name === 'modal_ascension');
  assert.ok(ascensionModal);

  const closeBtn = ascensionModal.children.find(c => c.name === 'button_CLOSE');
  assert.ok(closeBtn, 'close button should exist');
  const closeBg = closeBtn.children[0];
  const closeText = closeBtn.children[2];
  assert.equal(closeBg.material.color.getHex(), 0xf000ff);
  assert.equal(closeText.material.color.getHex(), 0xffffff);

  const clearBtn = ascensionModal.children.find(c => c.name === 'button_ERASE_TIMELINE');
  assert.ok(clearBtn, 'clear button should exist');
  const clearBg = clearBtn.children[0];
  const clearText = clearBtn.children[2];
  assert.equal(clearBg.material.color.getHex(), 0xc0392b);
  assert.equal(clearText.material.color.getHex(), 0xffffff);

  const headerLine = ascensionModal.children.find(c => c.name === 'ascension_header_divider');
  const footerLine = ascensionModal.children.find(c => c.name === 'ascension_footer_divider');
  assert.ok(headerLine);
  assert.ok(footerLine);
  assert.equal(headerLine.material.color.getHex(), 0x00ffff);
  assert.equal(footerLine.material.color.getHex(), 0x00ffff);
});

test('ascension tooltip shows Mastery and cost for unpurchased talent', async () => {
  const { initModals, showModal, getModalObjects } = await setup();
  initModals();
  showModal('ascension');
  const ascensionModal = getModalObjects().find(m => m.name === 'modal_ascension');
  assert.ok(ascensionModal);
  const grid = ascensionModal.children.find(c => c.name === 'ascension_grid');
  const coreBtn = grid.children.find(c => c.userData && c.userData.talentId === 'core-nexus');
  assert.ok(coreBtn, 'core nexus button should exist');
  coreBtn.userData.onHover(true);
  const tooltip = grid.children.find(c => c.userData && c.userData.rank);
  assert.ok(tooltip, 'tooltip should exist');
  assert.equal(tooltip.userData.rank.userData.text, 'Mastery');
  assert.equal(tooltip.userData.cost.userData.text, 'Cost: 1 AP');
  const divider = tooltip.children.find(c => c.name === 'tooltip_footer_divider');
  assert.ok(divider, 'tooltip footer divider should exist');
  assert.equal(divider.material.color.getHex(), 0x00ffff);
});

test('talent button uses 1.15 hover scale', async () => {
  const { initModals, showModal, getModalObjects } = await setup();
  initModals();
  showModal('ascension');
  const ascensionModal = getModalObjects().find(m => m.name === 'modal_ascension');
  assert.ok(ascensionModal);
  const grid = ascensionModal.children.find(c => c.name === 'ascension_grid');
  const coreBtn = grid.children.find(c => c.userData && c.userData.talentId === 'core-nexus');
  assert.ok(coreBtn, 'core nexus button should exist');
  coreBtn.userData.onHover(true);
  assert.equal(coreBtn.scale.x, 1.15);
});

