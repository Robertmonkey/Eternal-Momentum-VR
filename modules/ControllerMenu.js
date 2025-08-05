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
  group.name = `controller_button_${label.replace(/\s+/g, '_')}`;

  // Create text sprites first so we can size the background to fit the label
  // exactly, mirroring the flexible width of the 2D game's buttons.
  const iconSprite = createTextSprite(icon, 32);
  const textSprite = createTextSprite(label, 24);
  iconSprite.renderOrder = textSprite.renderOrder = 2;

  const padding = 0.02;
  const iconWidth = iconSprite.scale.x;
  const textWidth = textSprite.scale.x;
  const totalWidth = padding * 3 + iconWidth + textWidth;

  // Button backgrounds mirror the flat panels from the 2D game without
  // applying the global wallpaper texture.
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(totalWidth, 0.08), holoMaterial(0x111122, 0.8));
  // Ensure controller menu buttons render above any panel backing by
  // giving their faces a higher render order.
  bg.renderOrder = 1;
  const border = new THREE.Mesh(new THREE.PlaneGeometry(totalWidth + 0.01, 0.09), holoMaterial(0x00ffff, 0.5));
  border.position.z = -0.001;
  // Border renders behind the button face yet above any modal background.
  border.renderOrder = 0.5;
  group.add(bg, border);

  // Position icon and text with even padding from the left edge for the
  // expanded state.  We'll collapse to just the icon by default and restore
  // these positions on hover.
  const startX = -totalWidth / 2 + padding;
  const expandedIconX = startX + iconWidth / 2;
  const expandedTextX = expandedIconX + iconWidth / 2 + padding + textWidth / 2;

  // Start with the icon centered and hide the label/background so only the
  // emoji is visible until hovered.
  iconSprite.position.set(0, 0, 0.01);
  textSprite.position.set(expandedTextX, 0, 0.01);
  bg.visible = border.visible = textSprite.visible = false;
  group.add(iconSprite, textSprite);

  const setHover = hovered => {
    const intensity = hovered ? 1.5 : 1;
    bg.material.emissiveIntensity = intensity;
    border.material.emissiveIntensity = intensity;
    group.scale.setScalar(hovered ? 1.05 : 1);
    bg.visible = border.visible = textSprite.visible = hovered;
    if (hovered) {
      iconSprite.position.x = expandedIconX;
      textSprite.position.x = expandedTextX;
    } else {
      iconSprite.position.x = 0;
    }
  };

  [bg, border, iconSprite, textSprite].forEach(obj => {
    obj.userData.onSelect = onSelect;
    obj.userData.onHover = setHover;
  });

  // Ensure we start collapsed.
  setHover(false);

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

  const ascBtn = createButton('Ascension Conduit', '💠', () => showModal('ascension'));
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
