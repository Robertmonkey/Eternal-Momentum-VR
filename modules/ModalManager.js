import * as THREE from '../vendor/three.module.js';
import { getCamera } from './scene.js';
import { resetGame, state, savePlayerState } from './state.js';
import { AudioManager } from './audio.js';
import { STAGE_CONFIG } from './config.js';
import { bossData } from './bosses.js';
import { applyAllTalentEffects, purchaseTalent } from './ascension.js';
import { TALENT_GRID_CONFIG } from './talents.js';
import { holoMaterial } from './UIManager.js';

let modalGroup;
const modals = {};

function ensureGroup(camOverride) {
  if (!modalGroup) {
    const cam = camOverride || getCamera();
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
  sprite.userData.ctx = ctx;
  sprite.userData.canvas = canvas;
  sprite.userData.font = `${size}px sans-serif`;
  return sprite;
}

function updateTextSprite(sprite, text) {
  const ctx = sprite.userData.ctx;
  const canvas = sprite.userData.canvas;
  if (!ctx || !canvas) return;
  if (typeof ctx.clearRect === 'function') {
    ctx.clearRect(0,0,canvas.width, canvas.height);
  }
  if (sprite.userData.font) ctx.font = sprite.userData.font;
  ctx.fillStyle = '#eaf2ff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, canvas.height / 2);
  sprite.material.map.needsUpdate = true;
}

function createButton(label, onSelect) {
  const group = new THREE.Group();
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.15),
    holoMaterial(0x111111, 0.8)
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
    holoMaterial(0x141428, 0.95)
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

function createSettingsModal() {
  const modal = new THREE.Group();
  modal.name = 'settings';
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.2),
    holoMaterial(0x141428, 0.95)
  );
  modal.add(bg);
  const header = createTextSprite('SETTINGS', 64);
  header.position.set(0, 0.45, 0.01);
  modal.add(header);

  const handedSprite = createTextSprite(`Handed: ${state.settings.handedness}`, 32);
  const handedBtn = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.15), holoMaterial(0x111111, 0.8));
  handedSprite.position.set(0, 0, 0.01);
  const handedGroup = new THREE.Group();
  handedGroup.add(handedBtn);
  handedGroup.add(handedSprite);
  handedBtn.userData.onSelect = () => {
    state.settings.handedness = state.settings.handedness === 'right' ? 'left' : 'right';
    updateTextSprite(handedSprite, `Handed: ${state.settings.handedness}`);
    savePlayerState();
  };
  handedGroup.position.set(0, 0.15, 0.02);
  modal.add(handedGroup);

  function createVolumeControl(label, settingKey, yPos) {
    const group = new THREE.Group();
    const minus = createButton('-', () => adjust(-5));
    const plus = createButton('+', () => adjust(5));
    const display = createTextSprite(`${label}: ${state.settings[settingKey]}%`, 32);
    minus.position.set(-0.6, 0, 0);
    plus.position.set(0.6, 0, 0);
    display.position.set(0, 0, 0.01);
    group.add(minus);
    group.add(plus);
    group.add(display);

    function adjust(delta) {
      let v = state.settings[settingKey] + delta;
      v = Math.min(100, Math.max(0, v));
      state.settings[settingKey] = v;
      updateTextSprite(display, `${label}: ${v}%`);
      if (settingKey === 'musicVolume') {
        AudioManager.setMusicVolume(v / 100);
      } else if (settingKey === 'sfxVolume') {
        AudioManager.setSfxVolume(v / 100);
      }
      savePlayerState();
    }
    group.position.set(0, yPos, 0.02);
    return group;
  }

  modal.add(createVolumeControl('Music', 'musicVolume', -0.1));
  modal.add(createVolumeControl('SFX', 'sfxVolume', -0.35));

  const homeBtn = createButton('Home', () => {
    if (typeof window !== 'undefined' && window.showHome) {
      window.showHome();
    }
  });
  homeBtn.position.set(0, -0.6, 0.02);
  modal.add(homeBtn);

  modal.visible = false;
  return modal;
}

function createStageSelectModal() {
  const modal = new THREE.Group();
  modal.name = 'levelSelect';
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.4),
    holoMaterial(0x141428, 0.95)
  );
  modal.add(bg);
  const header = createTextSprite('SELECT STAGE', 64);
  header.position.set(0, 0.55, 0.01);
  modal.add(header);

  const list = new THREE.Group();
  list.position.set(0, 0.35, 0.02);
  const maxStage = STAGE_CONFIG.length;
  for (let i = 1; i <= maxStage; i++) {
    const stageInfo = STAGE_CONFIG.find(s => s.stage === i);
    if (!stageInfo) continue;
    const btn = createButton(`STAGE ${i}: ${stageInfo.displayName}`, () => startStage(i));
    btn.position.set(0, -0.25 * (i - 1), 0);
    list.add(btn);
  }
  modal.add(list);

  const closeBtn = createButton('Close', () => hideModal('levelSelect'));
  closeBtn.position.set(0, -0.55, 0.02);
  modal.add(closeBtn);

  modal.visible = false;
  return modal;
}

function createAscensionModal() {
  const modal = new THREE.Group();
  modal.name = 'ascension';
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.4),
    holoMaterial(0x141428, 0.95)
  );
  modal.add(bg);
  const header = createTextSprite('ASCENSION CONDUIT', 64);
  header.position.set(0, 0.55, 0.01);
  modal.add(header);

  const apDisplay = createTextSprite(`AP: ${state.player.ascensionPoints}`, 32);
  apDisplay.position.set(0, 0.35, 0.01);
  modal.add(apDisplay);

  const grid = new THREE.Group();
  grid.position.set(0, 0.1, 0.02);
  const nodes = {};
  const width = 1.4;
  const height = 1.0;
  const infoGroup = new THREE.Group();
  infoGroup.position.set(0, -0.05, 0.02);
  const infoName = createTextSprite('', 36);
  infoName.position.set(0, 0.12, 0.01);
  const infoDesc = createTextSprite('', 24);
  infoDesc.position.set(0, 0, 0.01);
  const infoCost = createTextSprite('', 24);
  infoCost.position.set(0, -0.12, 0.01);
  infoGroup.add(infoName, infoDesc, infoCost);
  modal.add(infoGroup);

  function showInfo(talent) {
    const rank = state.player.purchasedTalents.get(talent.id) || 0;
    const isMax = rank >= talent.maxRanks;
    const cost = isMax ? 'MAXED' : `${talent.costPerRank[talent.isInfinite ? 0 : rank]} AP`;
    updateTextSprite(infoName, talent.name);
    updateTextSprite(infoDesc, talent.description(rank + 1, isMax));
    updateTextSprite(infoCost, `Rank ${rank}/${talent.isInfinite ? '∞' : talent.maxRanks} - Cost: ${cost}`);
  }
  Object.values(TALENT_GRID_CONFIG).forEach(constellation => {
    Object.keys(constellation).forEach(key => {
      if (key === 'color') return;
      const t = constellation[key];
      const btn = createButton(t.icon, () => {
        purchaseTalent(t.id);
        updateTextSprite(apDisplay, `AP: ${state.player.ascensionPoints}`);
        updateNode(t.id);
        showInfo(t);
      });
      const bgMesh = btn.children[0];
      if (bgMesh) {
        bgMesh.userData.onHover = () => showInfo(t);
      }
      const rank = createTextSprite(`0/${t.isInfinite ? '∞' : t.maxRanks}`, 24);
      rank.position.set(0.18, 0, 0.01);
      btn.add(rank);
      const x = (t.position.x / 100 - 0.5) * width;
      const y = (0.5 - t.position.y / 100) * height;
      btn.position.set(x, y, 0);
      grid.add(btn);
      nodes[t.id] = { rank, talent: t };
    });
  });
  modal.add(grid);

  function updateNode(id) {
    const info = nodes[id];
    if (!info) return;
    const r = state.player.purchasedTalents.get(id) || 0;
    updateTextSprite(info.rank, `${r}/${info.talent.isInfinite ? '∞' : info.talent.maxRanks}`);
  }

  Object.keys(nodes).forEach(updateNode);
  if (nodes['core-nexus']) {
    showInfo(nodes['core-nexus'].talent);
  }

  const clearBtn = createButton('Erase Timeline', () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('eternalMomentumSave');
    }
  });
  clearBtn.position.set(0, 0.05, 0.02);
  modal.add(clearBtn);

  const closeBtn = createButton('Close', () => hideModal('ascension'));
  closeBtn.position.set(0, -0.25, 0.02);
  modal.add(closeBtn);

  modal.visible = false;
  return modal;
}

function createCoresModal() {
  const modal = new THREE.Group();
  modal.name = 'cores';
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.6),
    holoMaterial(0x141428, 0.95)
  );
  modal.add(bg);
  const header = createTextSprite('ABERRATION CORES', 64);
  header.position.set(0, 0.65, 0.01);
  modal.add(header);

  const equippedText = createTextSprite('Equipped: None', 32);
  equippedText.position.set(0, 0.45, 0.01);
  modal.add(equippedText);

  const list = new THREE.Group();
  list.position.set(0, 0.3, 0.02);
  let index = 0;
  bossData.forEach(core => {
    if (!core.core_desc) return;
    const btn = createButton(core.name, () => equipCore(core.id));
    btn.position.set(0, -0.2 * index++, 0);
    list.add(btn);
  });
  modal.add(list);

  const unequipBtn = createButton('Unequip', () => equipCore(null));
  unequipBtn.position.set(0, -0.5, 0.02);
  modal.add(unequipBtn);

  const closeBtn2 = createButton('Close', () => hideModal('cores'));
  closeBtn2.position.set(0, -0.75, 0.02);
  modal.add(closeBtn2);

  function equipCore(id) {
    state.player.equippedAberrationCore = id;
    const core = bossData.find(b => b.id === id);
    updateTextSprite(
      equippedText,
      `Equipped: ${core ? core.name : 'None'}`
    );
    savePlayerState();
  }

  modal.visible = false;
  return modal;
}

const storyContent =
  'Reality is fraying. You are the Conduit, last anchor against the Unraveling.';

function createLoreModal() {
  const modal = new THREE.Group();
  modal.name = 'lore';
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.2),
    holoMaterial(0x141428, 0.95)
  );
  modal.add(bg);
  const header = createTextSprite('LORE CODEX', 64);
  header.position.set(0, 0.45, 0.01);
  modal.add(header);

  const body = createTextSprite(storyContent, 24);
  body.position.set(0, 0.15, 0.01);
  modal.add(body);

  const closeBtn = createButton('Close', () => hideModal('lore'));
  closeBtn.position.set(0, -0.35, 0.02);
  modal.add(closeBtn);

  modal.visible = false;
  return modal;
}


export function startStage(stage) {
  applyAllTalentEffects();
  resetGame(false);
  if (typeof stage === 'number') {
    state.currentStage = stage;
  }
  state.isPaused = false;
  Object.values(modals).forEach(m => m.visible = false);
}

export async function initModals(cam = getCamera()) {
  const group = ensureGroup(cam);
  if (!group || modals.gameOver) return;

  modals.gameOver = createModal('gameOver', 'TIMELINE COLLAPSED', [
    { label: 'Restart Stage', onSelect: () => startStage(state.currentStage) },
    { label: 'Ascension', onSelect: () => showModal('ascension') },
    { label: 'Cores', onSelect: () => showModal('cores') },
    { label: 'Stage Select', onSelect: () => showModal('levelSelect') }
  ]);
  group.add(modals.gameOver);

  modals.levelSelect = createStageSelectModal();
  group.add(modals.levelSelect);

  modals.ascension = createAscensionModal();
  group.add(modals.ascension);

  modals.cores = createCoresModal();
  group.add(modals.cores);

  modals.lore = createLoreModal();
  group.add(modals.lore);

  modals.settings = createSettingsModal();
  group.add(modals.settings);
}

export function showModal(id) {
  ensureGroup();
  Object.values(modals).forEach(m => { if (m) m.visible = false; });
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
