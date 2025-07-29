import * as THREE from '../vendor/three.module.js';
import { getCamera } from './scene.js';

let modalGroup;
const modals = {};

function ensureGroup() {
  if (!modalGroup) {
    const cam = getCamera();
    if (!cam) return null;
    modalGroup = new THREE.Group();
    modalGroup.name = 'modalGroup';
    cam.add(modalGroup);
  }
  return modalGroup;
}

function createTextSprite(text, size = 48, color = '#eaf2ff') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${size}px sans-serif`;
  const width = Math.ceil(ctx.measureText(text).width);
  canvas.width = width;
  canvas.height = size * 1.2;
  ctx.font = `${size}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  const scale = 0.001;
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
  return sprite;
}

function createButton(label, onSelect) {
  const group = new THREE.Group();
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.15),
    new THREE.MeshBasicMaterial({ color: 0x111111, opacity: 0.8, transparent: true })
  );
  group.add(bg);
  const text = createTextSprite(label, 32);
  text.position.set(0, 0, 0.01);
  group.add(text);
  bg.userData.onSelect = onSelect;
  return group;
}

function createModal(id, title, buttons) {
  const modal = new THREE.Group();
  modal.name = id;
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1),
    new THREE.MeshBasicMaterial({ color: 0x141428, opacity: 0.95, transparent: true, side: THREE.DoubleSide })
  );
  modal.add(bg);
  const header = createTextSprite(title, 64);
  header.position.set(0, 0.35, 0.01);
  modal.add(header);
  buttons.forEach((btn, i) => {
    const b = createButton(btn.label, btn.onSelect);
    b.position.set(0, 0.15 - i * 0.25, 0.02);
    modal.add(b);
  });
  modal.visible = false;
  return modal;
}

export function initModals() {
  const group = ensureGroup();
  if (!group || modals.gameOver) return;

  modals.gameOver = createModal('gameOver', 'TIMELINE COLLAPSED', [
    { label: 'Restart Stage', onSelect: () => console.log('Retry') },
    { label: 'Ascension', onSelect: () => console.log('Ascension') },
    { label: 'Cores', onSelect: () => console.log('Cores') },
    { label: 'Stage Select', onSelect: () => console.log('Stages') }
  ]);
  group.add(modals.gameOver);

  modals.levelSelect = createModal('levelSelect', 'SELECT STAGE', [
    { label: 'Start', onSelect: () => console.log('Start Stage') },
    { label: 'Close', onSelect: () => hideModal('levelSelect') }
  ]);
  group.add(modals.levelSelect);

  modals.ascension = createModal('ascension', 'ASCENSION CONDUIT', [
    { label: 'Close', onSelect: () => hideModal('ascension') }
  ]);
  group.add(modals.ascension);

  modals.cores = createModal('cores', 'ABERRATION CORES', [
    { label: 'Close', onSelect: () => hideModal('cores') }
  ]);
  group.add(modals.cores);
}

export function showModal(id) {
  ensureGroup();
  Object.values(modals).forEach(m => m.visible = false);
  if (modals[id]) {
    modals[id].visible = true;
    modals[id].position.set(0, 0, -1.5);
  }
}

export function hideModal(id) {
  if (modals[id]) modals[id].visible = false;
}

export function getModalObjects() {
  return Object.values(modals);
}
