import * as THREE from '../vendor/three.module.js';
import { getSecondaryController } from './scene.js';
import { showModal } from './ModalManager.js';
import { AudioManager } from './audio.js';
import { state } from './state.js';
import { holoMaterial, createTextSprite, updateTextSprite, getBgTexture } from './UIManager.js';

let menuGroup;
let coreButton, soundBtn;
let originalUpdateIcon;

function createButton(label, icon, onSelect) {
  const group = new THREE.Group();
  group.name = `controller_button_${label}`;

  // Make the background larger and apply the game's hex texture so buttons
  // resemble their 2D counterparts.
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.08), holoMaterial(0x111122, 0.8));
  const tex = getBgTexture();
  if (tex) {
    bg.material.map = tex;
    bg.material.needsUpdate = true;
  }
  const border = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.09), holoMaterial(0x00ffff, 0.5));
  border.position.z = -0.001;
  group.add(bg, border);

  const iconSprite = createTextSprite(icon, 32);
  iconSprite.position.set(-0.09, 0, 0.01);
  const textSprite = createTextSprite(label, 24);
  textSprite.position.set(0.04, 0, 0.01);
  group.add(iconSprite, textSprite);

  const setHover = hovered => {
    const intensity = hovered ? 1.5 : 1;
    bg.material.emissiveIntensity = intensity;
    border.material.emissiveIntensity = intensity;
    group.scale.setScalar(hovered ? 1.05 : 1);
  };

  [bg, border, iconSprite, textSprite].forEach(obj => {
    obj.userData.onSelect = onSelect;
    obj.userData.onHover = setHover;
  });

  return group;
}

export function initControllerMenu() {
  const controller = getSecondaryController();
  if (!controller || menuGroup) return;

  menuGroup = new THREE.Group();
  menuGroup.name = 'controllerMenu';
  // Position it to appear attached to the controller
  menuGroup.position.set(0, 0.1, -0.05);
  menuGroup.rotation.x = -0.7; // Angle it for readability
  // Buttons were tiny compared to the original UI; scaling the whole menu
  // keeps relative spacing intact while matching the 2D game's footprint.
  menuGroup.scale.setScalar(1.5);

  const stageBtn = createButton('Stage Select', '🗺️', () => showModal('levelSelect'));
  stageBtn.position.set(0, 0.06, 0);
  menuGroup.add(stageBtn);

  const ascBtn = createButton('Ascend', '💠', () => showModal('ascension'));
  ascBtn.position.set(0, 0, 0);
  menuGroup.add(ascBtn);

  soundBtn = createButton('Sound', '🔊', () => AudioManager.toggleMute());
  soundBtn.position.set(0, -0.06, 0);
  menuGroup.add(soundBtn);

  // This ensures our 3D button icon updates when the sound is toggled
  originalUpdateIcon = AudioManager.updateButtonIcon;
  AudioManager.updateButtonIcon = () => {
    if (originalUpdateIcon) originalUpdateIcon.call(AudioManager); // Call the original function if it exists
    const icon = AudioManager.userMuted ? '🔇' : '🔊';
    if (soundBtn) {
        const iconSprite = soundBtn.children[1]; // The icon is the second child
        updateTextSprite(iconSprite, icon);
    }
  };
  AudioManager.updateButtonIcon(); // Set initial state

  coreButton = createButton('Cores', '◎', () => showModal('cores'));
  coreButton.position.set(0, -0.12, 0);
  menuGroup.add(coreButton);
  
  controller.add(menuGroup);
}

export function updateControllerMenu() {
  if (!coreButton) return;
  // Show the cores button only after the feature is unlocked at level 10
  coreButton.visible = state.player.level >= 10;
}

export function getControllerMenuObjects() {
  // Return all interactable meshes from the buttons
  if (!menuGroup) return [];
  const objects = [];
  menuGroup.children.forEach(buttonGroup => {
    buttonGroup.children.forEach(child => {
      if (child.userData && child.userData.onSelect) objects.push(child);
    });
  });
  return objects;
}
