import * as THREE from '../vendor/three.module.js';
import { getSecondaryController } from './scene.js';
import { showModal } from './ModalManager.js';
import { AudioManager } from './audio.js';
import { state } from './state.js';
import { holoMaterial, createTextSprite, updateTextSprite } from './UIManager.js';

let menuGroup;
let coreButton, soundBtn;
let originalUpdateIcon;

function createButton(label, icon, onSelect) {
  const group = new THREE.Group();
  group.name = `controller_button_${label}`;
  // Make the background slightly wider to accommodate text and icon
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), holoMaterial(0x111122, 0.8));
  bg.userData.onSelect = onSelect;
  group.add(bg);
  
  const iconSprite = createTextSprite(icon, 32);
  iconSprite.position.set(-0.07, 0, 0.01);
  group.add(iconSprite);
  
  const textSprite = createTextSprite(label, 24);
  textSprite.position.set(0.02, 0, 0.01);
  group.add(textSprite);

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

  const stageBtn = createButton('Stages', '🗺️', () => showModal('levelSelect'));
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
  // Show the cores button only after the player has unlocked them (level 10)
  coreButton.visible = state.player.unlockedAberrationCores.size > 0;
}

export function getControllerMenuObjects() {
  // Return all interactable meshes from the buttons
  if (!menuGroup) return [];
  return menuGroup.children.map(buttonGroup => buttonGroup.children[0]);
}
