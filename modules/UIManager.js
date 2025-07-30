import * as THREE from '../vendor/three.module.js';
import { getCamera } from './scene.js';
import { state } from './state.js';
import { bossData } from './bosses.js';
import { powers } from './powers.js';

let uiGroup;
let hudMesh;
let healthFill, shieldFill, healthText;
let ascFill, ascText;
let statusGroup;
let offSlots = [];
let defSlots = [];
let offQueue = [];
let defQueue = [];
let coreGroup, coreIcon, coreCooldown;
let bossContainer;
const bossBars = new Map();
let bannerSprite, bannerTimeout;

export function holoMaterial(color = 0x141428, opacity = 0.85) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide
  });
}

export function initUI() {
  const camera = getCamera();
  if (!camera || uiGroup) return;

  uiGroup = new THREE.Group();
  uiGroup.name = 'uiGroup';
  uiGroup.visible = false;
  camera.add(uiGroup);

  createCommandBar();
  createHudElements();
  createBossUI();
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

  const material = holoMaterial(0x141428, 0.9);

  hudMesh = new THREE.Mesh(geometry, material);
  hudMesh.name = 'hudContainer';
  hudMesh.position.set(0, -0.4, -radius);
  uiGroup.add(hudMesh);
}

function createTextSprite(text, color = '#eaf2ff', size = 32) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontStack = "'Segoe UI','Roboto',sans-serif";
  ctx.font = `${size}px ${fontStack}`;
  const width = Math.ceil(ctx.measureText(text).width);
  canvas.width = width;
  canvas.height = size * 1.2;
  ctx.font = `${size}px ${fontStack}`;
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
  sprite.userData.font = `${size}px ${fontStack}`;
  return sprite;
}

function updateTextSprite(sprite, text, color = '#eaf2ff') {
  const ctx = sprite.userData.ctx;
  const canvas = sprite.userData.canvas;
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (sprite.userData.font) {
    ctx.font = sprite.userData.font;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, 0, canvas.height / 2);
  sprite.material.map.needsUpdate = true;
}

function createHexGeometry(size) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 6 + (i * Math.PI / 3);
    const x = size * Math.cos(angle);
    const y = size * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function createAbilitySlot(size) {
  const geo = createHexGeometry(size);
  const mat = holoMaterial(0x111111, 0.6);
  const mesh = new THREE.Mesh(geo, mat);
  const sprite = createTextSprite('');
  sprite.position.set(0, 0, 0.01);
  mesh.add(sprite);
  return { mesh, sprite };
}

function createCoreSocket(size) {
  const group = new THREE.Group();
  const socket = new THREE.Mesh(new THREE.CircleGeometry(size, 32), holoMaterial(0x111111, 0.6));
  const icon = createTextSprite('◎', '#eaf2ff', 48);
  icon.position.set(0, 0, 0.01);
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(size * 2, size * 2), holoMaterial(0x000000, 0.7));
  overlay.position.set(0, 0, 0.015);
  overlay.scale.y = 0;
  group.add(socket);
  group.add(icon);
  group.add(overlay);
  return { group, icon, overlay };
}

function createHudElements() {
  const group = new THREE.Group();
  group.name = 'hudElements';
  hudMesh.add(group);

  // Health bar background
  const bgMat = holoMaterial(0x111111, 0.6);
  const barBg = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.08), bgMat);
  barBg.position.set(0, 0.08, 0.01);
  group.add(barBg);

  // Health fill
  const hMat = holoMaterial(0xff5555, 1);
  healthFill = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.06), hMat);
  healthFill.position.set(0, 0.08, 0.015);
  healthFill.scale.x = 1;
  group.add(healthFill);

  // Shield overlay
  const sMat = holoMaterial(0x00ffff, 0.5);
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

  const aMat = holoMaterial(0x8e44ad, 1);
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

  // Ability slots
  const powerGroup = new THREE.Group();
  powerGroup.position.set(0, -0.17, 0.02);
  group.add(powerGroup);

  const mainSize = 0.07;
  const queueSize = 0.045;
  const spacing = 0.09;

  // Defensive main slot (left)
  const defMain = createAbilitySlot(mainSize);
  defMain.mesh.position.set(-spacing / 2, 0, 0);
  powerGroup.add(defMain.mesh);
  defSlots[0] = defMain;

  // Offensive main slot (right)
  const offMain = createAbilitySlot(mainSize);
  offMain.mesh.position.set(spacing / 2, 0, 0);
  powerGroup.add(offMain.mesh);
  offSlots[0] = offMain;

  // Defensive queue (left column)
  for (let i = 1; i <= 2; i++) {
    const slot = createAbilitySlot(queueSize);
    slot.mesh.position.set(-spacing, (i === 1 ? 0.055 : -0.055), 0);
    powerGroup.add(slot.mesh);
    defQueue.push(slot);
  }

  // Offensive queue (right column)
  for (let i = 1; i <= 2; i++) {
    const slot = createAbilitySlot(queueSize);
    slot.mesh.position.set(spacing, (i === 1 ? 0.055 : -0.055), 0);
    powerGroup.add(slot.mesh);
    offQueue.push(slot);
  }

  // Core socket at center
  const core = createCoreSocket(0.05);
  core.group.position.set(0, 0, 0.01);
  powerGroup.add(core.group);
  coreGroup = core.group;
  coreIcon = core.icon;
  coreCooldown = core.overlay;
}

function createBossUI() {
  bossContainer = new THREE.Group();
  bossContainer.name = 'bossContainer';
  bossContainer.position.set(0, 0.45, -1.2);
  uiGroup.add(bossContainer);
}

function createBossBar(boss) {
  const group = new THREE.Group();
  const bgMat = holoMaterial(0x111111, 0.6);
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.05), bgMat);
  group.add(bg);

  const fillMat = holoMaterial(boss.color || 0xff5555, 1);
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.03), fillMat);
  fill.position.set(0, 0, 0.01);
  fill.scale.x = 1;
  group.add(fill);

  const label = createTextSprite(boss.name, '#eaf2ff', 32);
  label.position.set(0, 0.04, 0.015);
  group.add(label);

  group.userData.fill = fill;
  group.userData.label = label;
  return group;
}

export function getUIRoot() {
  return uiGroup;
}

export function getHudMesh() {
  return hudMesh;
}

export function showHud() {
  if (uiGroup) uiGroup.visible = true;
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

  // Update ability icons
  offSlots.forEach((slot, idx) => {
    const key = state.offensiveInventory[idx];
    if (!slot) return;
    if (key) {
      updateTextSprite(slot.sprite, powers[key]?.emoji || '');
      slot.mesh.visible = true;
    } else {
      updateTextSprite(slot.sprite, '');
      slot.mesh.visible = idx === 0;
    }
  });

  defSlots.forEach((slot, idx) => {
    const key = state.defensiveInventory[idx];
    if (!slot) return;
    if (key) {
      updateTextSprite(slot.sprite, powers[key]?.emoji || '');
      slot.mesh.visible = true;
    } else {
      updateTextSprite(slot.sprite, '');
      slot.mesh.visible = idx === 0;
    }
  });

  defQueue.forEach((slot, i) => {
    const idx = i + 1;
    const key = state.defensiveInventory[idx];
    const visible = idx < state.player.unlockedDefensiveSlots && !!key;
    slot.mesh.visible = visible;
    if (visible) updateTextSprite(slot.sprite, powers[key].emoji);
  });

  offQueue.forEach((slot, i) => {
    const idx = i + 1;
    const key = state.offensiveInventory[idx];
    const visible = idx < state.player.unlockedOffensiveSlots && !!key;
    slot.mesh.visible = visible;
    if (visible) updateTextSprite(slot.sprite, powers[key].emoji);
  });

  // Core socket
  if (coreGroup) {
    coreGroup.visible = state.player.level >= 10;
    if (coreGroup.visible) {
      const coreId = state.player.equippedAberrationCore;
      const coreData = coreId ? bossData.find(b => b.id === coreId) : null;
      updateTextSprite(coreIcon, coreData ? '◎' : '◎');
      const color = coreData ? coreData.color : '#eaf2ff';
      coreIcon.material.map.needsUpdate = true;
      coreGroup.children[0].material.color.setStyle(color);

      if (coreCooldown) {
        let progress = 0;
        if (coreId) {
          const coreState = state.player.talent_states.core_states[coreId];
          if (coreState && coreState.cooldownUntil) {
            const cooldowns = {
              juggernaut: 8000,
              syphon: 5000,
              mirror_mirage: 12000,
              looper: 10000,
              gravity: 6000,
              architect: 15000,
              annihilator: 25000,
              puppeteer: 8000,
              helix_weaver: 5000,
              epoch_ender: 120000,
              splitter: 500,
            };
            const duration = cooldowns[coreId];
            if (duration) {
              const remaining = coreState.cooldownUntil - Date.now();
              progress = Math.max(0, remaining) / duration;
            }
          }
        }
      coreCooldown.scale.y = progress;
      }
    }
  }

  // --- Boss Health Bars ---
  if (bossContainer) {
    const bosses = state.enemies.filter(e => e.boss);
    const renderedTypes = new Set();
    const display = [];
    const currentIds = new Set();

    bosses.forEach(b => {
      currentIds.add(String(b.instanceId));
      const shared = ['sentinel_pair', 'fractal_horror'];
      if (shared.includes(b.id)) {
        if (!renderedTypes.has(b.id)) {
          display.push(b);
          renderedTypes.add(b.id);
        }
      } else {
        display.push(b);
      }
    });

    // Remove old bars
    for (const [id, bar] of bossBars.entries()) {
      if (!currentIds.has(id)) {
        bossContainer.remove(bar);
        bossBars.delete(id);
      }
    }

    display.forEach((boss, idx) => {
      let bar = bossBars.get(String(boss.instanceId));
      if (!bar) {
        bar = createBossBar(boss);
        bossBars.set(String(boss.instanceId), bar);
        bossContainer.add(bar);
      }
      bar.position.set(0, -idx * 0.1, 0);
      const hp = boss.id === 'fractal_horror' ? (state.fractalHorrorSharedHp ?? 0) : boss.hp;
      bar.userData.fill.scale.x = Math.max(0, hp / boss.maxHP);
      bar.userData.fill.material.color.setStyle(boss.color);
      updateTextSprite(bar.userData.label, boss.name);
    });
  }
}

export function showBossBanner(text) {
  if (!uiGroup) return;
  if (bannerSprite) {
    uiGroup.remove(bannerSprite);
    clearTimeout(bannerTimeout);
    bannerSprite = null;
  }
  bannerSprite = createTextSprite(`🚨 ${text} 🚨`, '#f1c40f', 48);
  bannerSprite.position.set(0, 0.7, -1);
  uiGroup.add(bannerSprite);
  bannerTimeout = setTimeout(() => {
    if (bannerSprite) {
      uiGroup.remove(bannerSprite);
      bannerSprite = null;
    }
  }, 2500);
}
