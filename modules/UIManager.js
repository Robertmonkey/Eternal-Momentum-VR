import * as THREE from '../vendor/three.module.js';
import { getCamera } from './scene.js';
import { state } from './state.js';

let uiGroup;
let hudMesh;
let healthFill, shieldFill, healthText;
let ascFill, ascText;
let statusGroup;

export function initUI() {
  const camera = getCamera();
  if (!camera || uiGroup) return;

  uiGroup = new THREE.Group();
  uiGroup.name = 'uiGroup';
  camera.add(uiGroup);

  createCommandBar();
  createHudElements();
}

function createCommandBar() {
  const radius = 1.2;      // distance from camera
  const height = 0.3;
  const arc = Math.PI / 2; // 90 degree curve
  const segs = 24;

  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    height,
    segs,
    1,
    true,
    -arc / 2,
    arc
  );
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));

  const material = new THREE.MeshBasicMaterial({
    color: 0x141428,
    opacity: 0.9,
    transparent: true,
    side: THREE.DoubleSide
  });

  hudMesh = new THREE.Mesh(geometry, material);
  hudMesh.name = 'hudContainer';
  hudMesh.position.set(0, -0.4, -radius);
  uiGroup.add(hudMesh);
}

function createTextSprite(text, color = '#eaf2ff', size = 32) {
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
  sprite.userData.ctx = ctx;
  sprite.userData.canvas = canvas;
  return sprite;
}

function updateTextSprite(sprite, text, color = '#eaf2ff') {
  const ctx = sprite.userData.ctx;
  const canvas = sprite.userData.canvas;
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, canvas.height / 2);
  sprite.material.map.needsUpdate = true;
}

function createHudElements() {
  const group = new THREE.Group();
  group.name = 'hudElements';
  hudMesh.add(group);

  // Health bar background
  const bgMat = new THREE.MeshBasicMaterial({ color: 0x111111, opacity: 0.6, transparent: true });
  const barBg = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.08), bgMat);
  barBg.position.set(0, 0.08, 0.01);
  group.add(barBg);

  // Health fill
  const hMat = new THREE.MeshBasicMaterial({ color: 0xff5555, transparent: true });
  healthFill = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.06), hMat);
  healthFill.position.set(0, 0.08, 0.015);
  healthFill.scale.x = 1;
  group.add(healthFill);

  // Shield overlay
  const sMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, opacity: 0.5, transparent: true });
  shieldFill = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.06), sMat);
  shieldFill.position.set(0, 0.08, 0.02);
  shieldFill.scale.x = 0;
  group.add(shieldFill);

  // Health text
  healthText = createTextSprite('100/100');
  healthText.position.set(0, 0.08, 0.03);
  group.add(healthText);

  // Ascension bar background
  const ascBg = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.06), bgMat.clone());
  ascBg.position.set(0, -0.05, 0.01);
  group.add(ascBg);

  const aMat = new THREE.MeshBasicMaterial({ color: 0x8e44ad, transparent: true });
  ascFill = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.04), aMat);
  ascFill.position.set(0, -0.05, 0.015);
  ascFill.scale.x = 0;
  group.add(ascFill);

  ascText = createTextSprite('LVL 1');
  ascText.position.set(0, -0.05, 0.025);
  group.add(ascText);

  // Status effects container
  statusGroup = new THREE.Group();
  statusGroup.position.set(0, 0.18, 0.03);
  group.add(statusGroup);
}

export function getUIRoot() {
  return uiGroup;
}

export function getHudMesh() {
  return hudMesh;
}

export function updateHud() {
  if (!hudMesh) return;

  const healthPct = Math.max(0, state.player.health) / state.player.maxHealth;
  if (healthFill) healthFill.scale.x = healthPct;
  if (healthText) updateTextSprite(healthText, `${Math.max(0, Math.round(state.player.health))}/${Math.round(state.player.maxHealth)}`);

  const shieldEffect = state.player.statusEffects.find(e => e.name === 'Shield' || e.name === 'Contingency Protocol');
  if (shieldFill) {
    if (shieldEffect) {
      const now = Date.now();
      const remaining = shieldEffect.endTime - now;
      const duration = shieldEffect.endTime - shieldEffect.startTime;
      shieldFill.visible = true;
      shieldFill.scale.x = Math.max(0, remaining) / duration;
    } else {
      shieldFill.visible = false;
    }
  }

  const ascPct = state.player.essence / state.player.essenceToNextLevel;
  if (ascFill) ascFill.scale.x = ascPct;
  if (ascText) updateTextSprite(ascText, `LVL ${state.player.level}`);

  // Status effects
  if (statusGroup) {
    statusGroup.clear();
    const size = 24;
    const spacing = 0.07;
    state.player.statusEffects.forEach((effect, idx) => {
      const sprite = createTextSprite(effect.emoji, '#ffffff', size);
      sprite.position.set((-0.3) + idx * spacing, 0, 0);
      statusGroup.add(sprite);
    });
  }
}
