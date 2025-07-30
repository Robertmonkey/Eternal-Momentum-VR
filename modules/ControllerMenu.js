import * as THREE from '../vendor/three.module.js';
import { getControllers } from './scene.js';
import { showModal } from './ModalManager.js';
import { AudioManager } from './audio.js';
import { state } from './state.js';

let menuGroup;
let coreButton;
let originalUpdateIcon;

function holoMaterial(color = 0x141428, opacity = 0.85) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide
  });
}

function createTextSprite(text, size = 48, color = '#eaf2ff') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${size}px sans-serif`;
  const width = Math.ceil(ctx.measureText(text).width) || 1;
  canvas.width = width;
  canvas.height = size * 1.2;
  ctx.font = `${size}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  const scale = 0.001;
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
  return sprite;
}

function createButton(icon, onSelect) {
  const group = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), holoMaterial(0x111111, 0.8));
  group.add(bg);
  const sprite = createTextSprite(icon, 48);
  sprite.position.set(0, 0, 0.01);
  group.add(sprite);
  bg.userData.onSelect = onSelect;
  return group;
}

export function initControllerMenu() {
  const leftController = getControllers()[1];
  if (!leftController || menuGroup) return;

  menuGroup = new THREE.Group();
  menuGroup.name = 'controllerMenu';
  menuGroup.position.set(0.05, 0.05, -0.1);

  const stageBtn = createButton('🗺️', () => showModal('levelSelect'));
  stageBtn.position.set(0, 0.04, 0);
  menuGroup.add(stageBtn);

  const ascBtn = createButton('💠', () => showModal('ascension'));
  ascBtn.position.set(0, -0.04, 0);
  menuGroup.add(ascBtn);

  const soundBtn = createButton('🔊', () => AudioManager.toggleMute());
  soundBtn.position.set(0, -0.12, 0);
  menuGroup.add(soundBtn);
  originalUpdateIcon = AudioManager.updateButtonIcon;
  AudioManager.updateButtonIcon = () => {
    if (originalUpdateIcon) originalUpdateIcon.call(AudioManager);
    const icon = AudioManager.userMuted ? '🔇' : '🔊';
    if (soundBtn.children[1]) soundBtn.remove(soundBtn.children[1]);
    const sprite = createTextSprite(icon, 48);
    sprite.position.set(0, 0, 0.01);
    soundBtn.add(sprite);
  };
  AudioManager.updateButtonIcon();

  coreButton = createButton('◎', () => showModal('cores'));
  coreButton.position.set(0, -0.2, 0);
  menuGroup.add(coreButton);

  leftController.add(menuGroup);
}

export function updateControllerMenu() {
  if (!coreButton) return;
  coreButton.visible = state.player.unlockedAberrationCores.size > 0;
}

export function getControllerMenu() {
  return menuGroup;
}
