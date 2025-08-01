import * as THREE from '../vendor/three.module.js';
import { getCamera, getScene } from './scene.js';
import { resetGame, state, savePlayerState } from './state.js';
import { refreshPrimaryController } from './PlayerController.js';
import { AudioManager } from './audio.js';
import { STAGE_CONFIG } from './config.js';
import { bossData } from './bosses.js';
import { applyAllTalentEffects, purchaseTalent } from './ascension.js';
import { TALENT_GRID_CONFIG } from './talents.js';
import { holoMaterial } from './UIManager.js';

/*
 * ModalManager_v2 replicates the original Eternal Momentum UI as closely as
 * possible within the VR environment.  We base all colours and fonts off
 * the variables defined in the old style.css: dark backgrounds, cyan and
 * magenta glows, and light text【802164479894751†L0-L8】.  The layout and
 * spacing of each modal match the original VR implementation to preserve
 * functionality (ascension constellations, stage lists, etc.).  Borders and
 * subtle glows are added to panels and buttons to mirror the old game.
 */

// Colour constants derived from the old game's CSS
const DARK_BG_COLOR = 0x1e1e2f;  // --dark-bg【802164479894751†L0-L8】
const BORDER_COLOR  = 0x00ffff;  // --primary-glow【802164479894751†L0-L8】
const FONT_COLOR    = '#eaf2ff'; // --font-color【802164479894751†L0-L8】

// Load a starry background texture to emulate the original game's bg.png. The
// image should be placed in the assets folder at ../assets/bg.png.  A low
// opacity overlay using this texture is drawn on top of each panel to
// approximate the translucent nebula seen in the old menus.  If the texture
// fails to load or the test environment lacks DOM methods, the material will
// simply remain empty.
let starTexture;
if (typeof document !== 'undefined' && document.createElementNS) {
  starTexture = new THREE.TextureLoader().load('../assets/bg.png', tex => {
    tex.encoding = THREE.sRGBEncoding;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
  });
} else {
  starTexture = new THREE.Texture();
}

let modalGroup;
let modalCamera;
const modals = {};

function ensureGroup(camOverride) {
  if (!modalGroup) {
    const scene = getScene();
    modalCamera = camOverride || getCamera();
    modalGroup = new THREE.Group();
    modalGroup.name = 'modalGroup';
    if (scene) scene.add(modalGroup);
  } else if (camOverride) {
    modalCamera = camOverride;
  }
  return modalGroup;
}

// Text sprite helper with optional size and colour
function createTextSprite(text, size = 32, color = FONT_COLOR) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontStack = "'Segoe UI','Roboto',sans-serif";
  ctx.font = `${size}px ${fontStack}`;
  const width = Math.ceil(ctx.measureText(text).width) || 1;
  canvas.width = width;
  canvas.height = size * 1.2;
  ctx.font = `${size}px ${fontStack}`;
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
  sprite.userData.font = `${size}px ${fontStack}`;
  return sprite;
}

function updateTextSprite(sprite, text, color = FONT_COLOR) {
  const ctx = sprite.userData.ctx;
  const canvas = sprite.userData.canvas;
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (sprite.userData.font) ctx.font = sprite.userData.font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, canvas.height / 2);
  sprite.material.map.needsUpdate = true;
}

function wrapText(text, maxChars = 40) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (test.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function createTextBlock(text, size = 24, maxChars = 40) {
  const group = new THREE.Group();
  const lineHeight = size * 1.4 * 0.001;
  let index = 0;
  text.split('\n').forEach(par => {
    const lines = wrapText(par.trim(), maxChars);
    lines.forEach(l => {
      const sprite = createTextSprite(l, size, FONT_COLOR);
      sprite.position.set(0, -index * lineHeight, 0.01);
      group.add(sprite);
      index += 1;
    });
    index += 1; // blank line between paragraphs
  });
  group.userData.lineHeight = lineHeight;
  return group;
}

/**
 * Create a UI button with a subtle glowing border.  The size of the
 * button is slightly larger than the original VR buttons (0.5x0.15) to
 * better match the old game's wide rectangular buttons, but heights and
 * spacing remain unchanged so that lists do not overlap.
 */
function createButton(label, onSelect) {
  const group = new THREE.Group();
  const isIcon = label.length <= 2 && /[\p{Emoji}\p{Symbol}\p{Punctuation}]/u.test(label);
  // Use 0.8 width for textual buttons; 0.3 for icons. Height remains 0.15.
  const width = isIcon ? 0.3 : 0.8;
  const height = 0.15;
  const borderPad = 0.04;
  const border = new THREE.Mesh(
    new THREE.PlaneGeometry(width + borderPad, height + borderPad),
    holoMaterial(BORDER_COLOR, 0.35)
  );
  group.add(border);
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    holoMaterial(DARK_BG_COLOR, 0.9)
  );
  group.add(bg);
  const textSize = isIcon ? 36 : 28;
  const txt = createTextSprite(label, textSize, FONT_COLOR);
  txt.position.set(0, 0, 0.01);
  group.add(txt);
  bg.userData.onSelect = onSelect;
  return group;
}

// Attach up/down buttons and a draggable scroll thumb to a list group. This
// provides a simple scroll bar for long menus that need more items than will fit
// vertically. `list` should have children spaced by `rowSpacing` along -Y.
function addScrollBar(modal, list, viewHeight, rowSpacing) {
  const controls = new THREE.Group();
  controls.name = 'scrollBar';
  const barHeight = viewHeight;
  const track = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, barHeight),
    holoMaterial(BORDER_COLOR, 0.25)
  );
  controls.add(track);
  const thumbHeight = Math.max(0.1, Math.min(barHeight, barHeight * (viewHeight / (list.children.length * rowSpacing))));
  const thumb = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, thumbHeight),
    holoMaterial(0x00ffff, 0.6)
  );
  thumb.position.y = barHeight / 2 - thumbHeight / 2;
  controls.add(thumb);
  const upBtn = createButton('▲', () => scroll(-1));
  upBtn.name = 'scrollUp';
  upBtn.position.set(0, barHeight / 2 + 0.1, 0.02);
  controls.add(upBtn);
  const downBtn = createButton('▼', () => scroll(1));
  downBtn.name = 'scrollDown';
  downBtn.position.set(0, -barHeight / 2 - 0.1, 0.02);
  controls.add(downBtn);
  controls.position.set(0.75, 0.35 - barHeight / 2, 0.02);
  modal.add(controls);
  let offset = 0;
  const maxOffset = Math.max(0, rowSpacing * (list.children.length - viewHeight / rowSpacing));
  function updateThumb() {
    const ratio = maxOffset === 0 ? 0 : offset / maxOffset;
    thumb.position.y = barHeight / 2 - thumbHeight / 2 - ratio * (barHeight - thumbHeight);
  }
  function scroll(dir) {
    offset = THREE.MathUtils.clamp(offset + dir * rowSpacing, 0, maxOffset);
    list.position.y = 0.35 - offset;
    updateThumb();
  }
  return { scroll: dir => scroll(dir) };
}

// Generic modal creation: add a border behind the original panel
function createModal(id, title, buttons) {
  const modal = new THREE.Group();
  modal.name = id;
  // Original sizes from VR: 1.6 x 1
  const w = 1.6;
  const h = 1.0;
  const borderPad = 0.05;
  const border = new THREE.Mesh(
    new THREE.PlaneGeometry(w + borderPad, h + borderPad),
    holoMaterial(BORDER_COLOR, 0.35)
  );
  modal.add(border);
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    holoMaterial(DARK_BG_COLOR, 0.95)
  );
  modal.add(bg);
  // Insert a translucent star overlay behind all generic modals.  This
  // replicates the nebula background from the original game's menus.
  const stars = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: starTexture, transparent: true, opacity: 0.15, depthWrite: false })
  );
  stars.position.z = 0.001;
  modal.add(stars);

  const header = createTextSprite(title, 60, FONT_COLOR);
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

// Settings modal (sizes unchanged; added borders and improved buttons)
function createSettingsModal() {
  const modal = new THREE.Group();
  modal.name = 'settings';
  const w = 1.6;
  const h = 1.2;
  const borderPad = 0.05;
  modal.add(new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.35)));
  // Dark base and star overlay to mirror old game backgrounds
  const genBg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95));
  modal.add(genBg);
  const genStars = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: starTexture, transparent: true, opacity: 0.15, depthWrite: false }));
  genStars.position.z = 0.001;
  modal.add(genStars);
  const header = createTextSprite('SETTINGS', 60, FONT_COLOR);
  header.position.set(0, 0.45, 0.01);
  modal.add(header);
  const handedSprite = createTextSprite(`Handed: ${state.settings.handedness}`, 32, FONT_COLOR);
  const handedBtnBg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.15), holoMaterial(DARK_BG_COLOR, 0.9));
  const handedBorder = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + 0.04, 0.15 + 0.04), holoMaterial(BORDER_COLOR, 0.35));
  const handedGroup = new THREE.Group();
  handedGroup.add(handedBorder);
  handedGroup.add(handedBtnBg);
  handedSprite.position.set(0, 0, 0.01);
  handedGroup.add(handedSprite);
  handedBtnBg.userData.onSelect = () => {
    state.settings.handedness = state.settings.handedness === 'right' ? 'left' : 'right';
    updateTextSprite(handedSprite, `Handed: ${state.settings.handedness}`, FONT_COLOR);
    refreshPrimaryController();
    savePlayerState();
  };
  handedGroup.position.set(0, 0.15, 0.02);
  modal.add(handedGroup);
  function createVolumeControl(label, key, y) {
    const group = new THREE.Group();
    const minus = createButton('-', () => adjust(-5));
    const plus = createButton('+', () => adjust(5));
    const display = createTextSprite(`${label}: ${state.settings[key]}%`, 32, FONT_COLOR);
    minus.position.set(-0.5, 0, 0);
    plus.position.set(0.5, 0, 0);
    display.position.set(0, 0, 0.01);
    group.add(minus);
    group.add(plus);
    group.add(display);
    function adjust(delta) {
      let v = state.settings[key] + delta;
      v = Math.min(100, Math.max(0, v));
      state.settings[key] = v;
      updateTextSprite(display, `${label}: ${v}%`, FONT_COLOR);
      if (key === 'musicVolume') AudioManager.setMusicVolume(v / 100);
      if (key === 'sfxVolume') AudioManager.setSfxVolume(v / 100);
      savePlayerState();
    }
    group.position.set(0, y, 0.02);
    return group;
  }
  modal.add(createVolumeControl('Music', 'musicVolume', -0.1));
  modal.add(createVolumeControl('SFX', 'sfxVolume', -0.35));
  const homeBtn = createButton('Home', () => {
    if (typeof window !== 'undefined' && window.showHome) window.showHome();
  });
  homeBtn.position.set(0, -0.6, 0.02);
  modal.add(homeBtn);
  modal.visible = false;
  return modal;
}

function createHomeModal() {
  const modal = new THREE.Group();
  modal.name = 'home';
  const w = 1.8;
  const h = 1.2;
  const borderPad = 0.05;
  modal.add(new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.35)));
  // Add dark base and star overlay
  const homeBg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95));
  modal.add(homeBg);
  const homeStars = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: starTexture, transparent: true, opacity: 0.15, depthWrite: false }));
  homeStars.position.z = 0.001;
  modal.add(homeStars);
  const title = createTextSprite('ETERNAL MOMENTUM', 64, FONT_COLOR);
  title.position.set(0, 0.45, 0.01);
  modal.add(title);
  const startBtn = createButton('AWAKEN', () => { if (typeof window !== 'undefined' && window.startGame) window.startGame(true); });
  startBtn.name = 'startBtn';
  startBtn.position.set(0, 0.15, 0.02);
  modal.add(startBtn);
  const continueBtn = createButton('CONTINUE MOMENTUM', () => { if (typeof window !== 'undefined' && window.startGame) window.startGame(false); });
  continueBtn.name = 'continueBtn';
  continueBtn.position.set(0, -0.1, 0.02);
  modal.add(continueBtn);
  // Show a confirmation dialog when severing the timeline, matching the original game's verbiage.
  const eraseBtn = createButton('SEVER TIMELINE', () => {
    showConfirm('|| SEVER TIMELINE? ||', 'Erasing the timeline will purge all progress and powers. This cannot be undone.', () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('eternalMomentumSave');
        if (typeof window !== 'undefined' && window.location) window.location.reload();
      }
    });
  });
  eraseBtn.name = 'eraseBtn';
  eraseBtn.position.set(0, -0.35, 0.02);
  modal.add(eraseBtn);
  modal.userData.updateButtons = () => {
    const hasSave = typeof localStorage !== 'undefined' && !!localStorage.getItem('eternalMomentumSave');
    startBtn.visible = !hasSave;
    continueBtn.visible = hasSave;
    eraseBtn.visible = hasSave;
  };
  modal.visible = false;
  return modal;
}

function createStageSelectModal() {
  const modal = new THREE.Group();
  modal.name = 'levelSelect';
  const w = 1.6;
  const h = 1.4;
  const borderPad = 0.05;
  modal.add(new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.35)));
  // Dark base and star overlay
  const stageBg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95));
  modal.add(stageBg);
  const stageStars = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: starTexture, transparent: true, opacity: 0.15, depthWrite: false }));
  stageStars.position.z = 0.001;
  modal.add(stageStars);
  const header = createTextSprite('SELECT STAGE', 64, FONT_COLOR);
  header.position.set(0, 0.55, 0.01);
  modal.add(header);
  const loreBtn = createButton('LORE CODEX', () => showModal('lore'));
  loreBtn.position.set(0.55, 0.55, 0.02);
  modal.add(loreBtn);
  const list = new THREE.Group();
  list.name = 'stageList';
  list.position.set(0, 0.35, 0.02);
  const maxStage = STAGE_CONFIG.length;
  for (let i = 1; i <= maxStage; i++) {
    const stageInfo = STAGE_CONFIG.find(s => s.stage === i);
    if (!stageInfo) continue;
    const row = new THREE.Group();
    row.name = `stage${i}`;
    const btn = createButton(`STAGE ${i}: ${stageInfo.displayName}`, () => startStage(i));
    row.add(btn);
    const mech = createButton('❔', () => showBossInfo(stageInfo.bosses, 'mechanics'));
    mech.position.set(0.6, 0, 0);
    row.add(mech);
    const loreIcon = createButton('ℹ️', () => showBossInfo(stageInfo.bosses, 'lore'));
    loreIcon.position.set(0.8, 0, 0);
    row.add(loreIcon);
    row.position.set(0, -0.25 * (i - 1), 0);
    list.add(row);
  }
  modal.add(list);
  addScrollBar(modal, list, 0.9, 0.25);
  const orreryBtn = createButton("WEAVER'S ORRERY", () => showModal('orrery'));
  orreryBtn.position.set(0, -0.35, 0.02);
  modal.add(orreryBtn);
  const jumpBtn = createButton('JUMP TO FRONTIER', () => {
    const frontier = state.player.highestStageBeaten > 0 ? state.player.highestStageBeaten + 1 : 1;
    startStage(frontier);
  });
  jumpBtn.position.set(0, -0.55, 0.02);
  modal.add(jumpBtn);
  const closeBtn = createButton('Close', () => hideModal('levelSelect'));
  closeBtn.position.set(0, -0.75, 0.02);
  modal.add(closeBtn);
  modal.visible = false;
  return modal;
}

function createAscensionModal() {
  const modal = new THREE.Group();
  modal.name = 'ascension';
  const w = 1.6;
  const h = 1.4;
  const borderPad = 0.05;
  modal.add(new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.35)));
  // Dark base and star overlay
  const ascBg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95));
  modal.add(ascBg);
  const ascStars = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: starTexture, transparent: true, opacity: 0.15, depthWrite: false }));
  ascStars.position.z = 0.001;
  modal.add(ascStars);
  const header = createTextSprite('ASCENSION CONDUIT', 64, FONT_COLOR);
  header.position.set(0, 0.55, 0.01);
  modal.add(header);
  const apDisplay = createTextSprite(`AP: ${state.player.ascensionPoints}`, 32, FONT_COLOR);
  apDisplay.position.set(0, 0.35, 0.01);
  modal.add(apDisplay);
  const grid = new THREE.Group();
  grid.position.set(0, 0.1, 0.02);
  const nodes = {};
  const width = 1.4;
  const height = 1.0;
  const infoGroup = new THREE.Group();
  infoGroup.position.set(0, -0.05, 0.02);
  const infoName = createTextSprite('', 36, FONT_COLOR);
  infoName.position.set(0, 0.12, 0.01);
  const infoDesc = createTextSprite('', 24, FONT_COLOR);
  infoDesc.position.set(0, 0, 0.01);
  const infoCost = createTextSprite('', 24, FONT_COLOR);
  infoCost.position.set(0, -0.12, 0.01);
  infoGroup.add(infoName, infoDesc, infoCost);
  modal.add(infoGroup);
  function showInfo(talent) {
    const rank = state.player.purchasedTalents.get(talent.id) || 0;
    const isMax = rank >= talent.maxRanks;
    const cost = isMax ? 'MAXED' : `${talent.costPerRank[talent.isInfinite ? 0 : rank]} AP`;
    updateTextSprite(infoName, talent.name, FONT_COLOR);
    updateTextSprite(infoDesc, talent.description(rank + 1, isMax), FONT_COLOR);
    updateTextSprite(infoCost, `Rank ${rank}/${talent.isInfinite ? '∞' : talent.maxRanks} - Cost: ${cost}`, FONT_COLOR);
  }
  Object.values(TALENT_GRID_CONFIG).forEach(constellation => {
    Object.keys(constellation).forEach(key => {
      if (key === 'color') return;
      const t = constellation[key];
      const btn = createButton(t.icon, () => {
        purchaseTalent(t.id);
        updateTextSprite(apDisplay, `AP: ${state.player.ascensionPoints}`, FONT_COLOR);
        updateNode(t.id);
        drawConnectors();
        showInfo(t);
      });
      const bgMesh = btn.children[1];
      if (bgMesh) bgMesh.userData.onHover = () => showInfo(t);
      const rank = createTextSprite(`0/${t.isInfinite ? '∞' : t.maxRanks}`, 24, FONT_COLOR);
      rank.position.set(0.18, 0, 0.01);
      btn.add(rank);
      const x = (t.position.x / 100 - 0.5) * width;
      const y = (0.5 - t.position.y / 100) * height;
      btn.position.set(x, y, 0);
      grid.add(btn);
      nodes[t.id] = { rank, talent: t, button: btn };
    });
  });
  modal.add(grid);
  const connectorGroup = new THREE.Group();
  connectorGroup.name = 'connectors';
  connectorGroup.position.z = 0.01;
  modal.add(connectorGroup);
  function drawConnectors() {
    connectorGroup.clear();
    Object.values(TALENT_GRID_CONFIG).forEach(constellation => {
      const color = constellation.color || BORDER_COLOR;
      Object.keys(constellation).forEach(key => {
        if (key === 'color') return;
        const talent = constellation[key];
        const node = nodes[talent.id];
        if (!node) return;
        talent.prerequisites.forEach(pr => {
          const pre = nodes[pr];
          if (!pre) return;
          const prereqRank = state.player.purchasedTalents.get(pr) || 0;
          const required = TALENT_GRID_CONFIG.core?.[pr]?.maxRanks || Object.values(TALENT_GRID_CONFIG).find(c => c[pr])?.[pr].maxRanks || 0;
          const mat = new THREE.LineBasicMaterial({ color: prereqRank >= required ? color : 0x444444, transparent: true, opacity: 0.6 });
          const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(pre.button.position.x, pre.button.position.y, 0),
            new THREE.Vector3(node.button.position.x, node.button.position.y, 0)
          ]);
          const line = new THREE.Line(geo, mat);
          connectorGroup.add(line);
        });
      });
    });
  }
  function updateNode(id) {
    const info = nodes[id];
    if (!info) return;
    const r = state.player.purchasedTalents.get(id) || 0;
    updateTextSprite(info.rank, `${r}/${info.talent.isInfinite ? '∞' : info.talent.maxRanks}`, FONT_COLOR);
  }
  Object.keys(nodes).forEach(updateNode);
  drawConnectors();
  if (nodes['core-nexus']) showInfo(nodes['core-nexus'].talent);
  const clearBtn = createButton('ERASE TIMELINE', () => {
    showConfirm('|| SEVER TIMELINE? ||', 'All Ascension progress and unlocked powers will be lost to the void. This action cannot be undone.', () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('eternalMomentumSave');
        if (typeof window !== 'undefined' && window.location && window.location.reload) window.location.reload();
      }
    });
  });
  clearBtn.position.set(0, 0.05, 0.02);
  modal.add(clearBtn);
  const closeBtn = createButton('CLOSE', () => hideModal('ascension'));
  closeBtn.position.set(0, -0.25, 0.02);
  modal.add(closeBtn);
  modal.visible = false;
  return modal;
}

function createCoresModal() {
  const modal = new THREE.Group();
  modal.name = 'cores';
  const w = 1.6;
  const h = 1.6;
  const borderPad = 0.05;
  modal.add(new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.35)));
  // Dark base and star overlay
  const coresBg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95));
  modal.add(coresBg);
  const coresStars = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: starTexture, transparent: true, opacity: 0.15, depthWrite: false }));
  coresStars.position.z = 0.001;
  modal.add(coresStars);
  const header = createTextSprite('ABERRATION CORE ATTUNEMENT', 64, FONT_COLOR);
  header.position.set(0, 0.65, 0.01);
  modal.add(header);
  const attunedLabel = createTextSprite('CURRENTLY ATTUNED', 32, FONT_COLOR);
  attunedLabel.name = 'attunedLabel';
  attunedLabel.position.set(0, 0.5, 0.01);
  modal.add(attunedLabel);
  const attunedName = createTextSprite('None', 32, FONT_COLOR);
  attunedName.name = 'attunedName';
  attunedName.position.set(0, 0.4, 0.01);
  modal.add(attunedName);
  const list = new THREE.Group();
  list.name = 'coreList';
  list.position.set(0, 0.25, 0.02);
  let index = 0;
  bossData.forEach(core => {
    if (!core.core_desc) return;
    const btn = createButton(core.name, () => equipCore(core.id));
    btn.position.set(0, -0.25 * index++, 0);
    list.add(btn);
  });
  modal.add(list);
  const unequipBtn = createButton('UNEQUIP CORE', () => equipCore(null));
  unequipBtn.name = 'unequipBtn';
  unequipBtn.position.set(0, -0.5, 0.02);
  modal.add(unequipBtn);
  const closeBtn2 = createButton('CLOSE', () => hideModal('cores'));
  closeBtn2.name = 'closeBtn';
  closeBtn2.position.set(0, -0.75, 0.02);
  modal.add(closeBtn2);
  function equipCore(id) {
    state.player.equippedAberrationCore = id;
    const core = bossData.find(b => b.id === id);
    updateTextSprite(attunedName, core ? core.name : 'None', FONT_COLOR);
    savePlayerState();
  }
  modal.userData.attunedName = attunedName;
  modal.visible = false;
  return modal;
}

function createOrreryModal() {
  const modal = new THREE.Group();
  modal.name = 'orrery';
  const w = 1.6;
  const h = 1.6;
  const borderPad = 0.05;
  modal.add(new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.35)));
  // Dark base and star overlay
  const orreryBg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95));
  modal.add(orreryBg);
  const orreryStars = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: starTexture, transparent: true, opacity: 0.15, depthWrite: false }));
  orreryStars.position.z = 0.001;
  modal.add(orreryStars);
  const header = createTextSprite("THE WEAVER'S ORRERY", 64, FONT_COLOR);
  header.position.set(0, 0.65, 0.01);
  modal.add(header);
  let totalEchoes = 0;
  const echoLabel = createTextSprite('ECHOES OF CREATION', 32, FONT_COLOR);
  echoLabel.position.set(0, 0.45, 0.01);
  modal.add(echoLabel);
  const points = createTextSprite(`${totalEchoes}`, 32, FONT_COLOR);
  points.position.set(0, 0.35, 0.01);
  modal.add(points);
  const bossList = new THREE.Group();
  bossList.name = 'bossList';
  bossList.position.set(0, 0.15, 0.02);
  modal.add(bossList);
  const rosterLabel = createTextSprite('TIMELINE ROSTER', 32, FONT_COLOR);
  rosterLabel.position.set(0, -0.05, 0.01);
  modal.add(rosterLabel);
  const selection = new THREE.Group();
  selection.name = 'selectionDisplay';
  selection.position.set(0, -0.25, 0.02);
  modal.add(selection);
  const costDisplay = createTextSprite('ECHOES SPENT: 0', 28, FONT_COLOR);
  costDisplay.position.set(0, -0.45, 0.01);
  modal.add(costDisplay);
  const clearBtn = createButton('CLEAR ROSTER', () => {
    selectedBosses = [];
    currentCost = 0;
    render();
  });
  clearBtn.position.set(0, -0.65, 0.02);
  modal.add(clearBtn);
  const startBtn = createButton('FORGE TIMELINE', () => startOrrery(selectedBosses));
  startBtn.name = 'startBtn';
  startBtn.position.set(0, -0.85, 0.02);
  modal.add(startBtn);
  const closeBtn = createButton('CLOSE', () => hideModal('orrery'));
  closeBtn.position.set(0, -1.05, 0.02);
  modal.add(closeBtn);
  const costs = { 1: 2, 2: 5, 3: 8 };
  let selectedBosses = [];
  let currentCost = 0;
  function render() {
    totalEchoes = 0;
    const hs = state.player.highestStageBeaten;
    if (hs >= 30) {
      totalEchoes += 10 + (hs - 30);
      if (hs >= 50) totalEchoes += 15;
      if (hs >= 70) totalEchoes += 20;
      if (hs >= 90) totalEchoes += 25;
    }
    updateTextSprite(points, `${totalEchoes - currentCost}`, FONT_COLOR);
    updateTextSprite(costDisplay, `ECHOES SPENT: ${currentCost}`, FONT_COLOR);
    bossList.clear();
    const available = bossData.filter(b => b.difficulty_tier).sort((a,b) => a.difficulty_tier - b.difficulty_tier);
    available.forEach((boss, i) => {
      const cost = costs[boss.difficulty_tier];
      const row = new THREE.Group();
      const btn = createButton(boss.name, () => {
        if (totalEchoes - currentCost >= cost) {
          selectedBosses.push(boss.id);
          currentCost += cost;
          render();
        }
      });
      row.add(btn);
      const mech = createButton('❔', () => showBossInfo([boss.id], 'mechanics'));
      mech.position.set(0.6, 0, 0);
      row.add(mech);
      const loreIcon = createButton('ℹ️', () => showBossInfo([boss.id], 'lore'));
      loreIcon.position.set(0.8, 0, 0);
      row.add(loreIcon);
      const cText = createTextSprite(String(cost), 24, FONT_COLOR);
      cText.position.set(1.0, 0, 0.01);
      row.add(cText);
      row.position.set(0, -0.25 * i, 0);
      bossList.add(row);
    });
    selection.clear();
    selectedBosses.forEach((id, idx) => {
      const boss = bossData.find(b => b.id === id);
      const btn = createButton(boss.name, () => {
        selectedBosses.splice(idx, 1);
        currentCost -= costs[boss.difficulty_tier];
        render();
      });
      btn.scale.set(0.5, 0.5, 0.5);
      btn.position.set(0, -0.2 * idx, 0);
      selection.add(btn);
    });
  }
  render();
  modal.userData.startBtn = startBtn;
  modal.userData.selectedBosses = selectedBosses;
  modal.userData.bossList = bossList;
  modal.userData.render = render;
  modal.visible = false;
  return modal;
}

const storyParagraphs = [
  'The Unraveling',
  'Reality is not a single thread, but an infinite, shimmering tapestry of timelines. This tapestry is fraying. A formless, silent entropy named the Unraveling consumes existence, timeline by timeline. It is a cosmic error causing reality to decohere into paradox and chaos. As each world\'s fundamental laws are overwritten, its echoes are twisted into monstrous Aberrations\u2014nightmarish amalgamations of what once was.',
  'The Conduit',
  'Amidst the universal decay, you exist. You are the Conduit, an impossible being capable of maintaining a stable presence across fracturing realities. Your consciousness is imbued with Eternal Momentum\u2014an innate, unyielding drive to push forward, to resist the decay, and to preserve the flickering embers of spacetime. By defeating Aberrations, you reclaim lost fragments of reality\'s source code, integrating them into your own being through the Ascension Conduit to grow stronger.',
  'Power-ups: Echoes of Stability',
  'The pickups you find scattered across the battlefield are not mere tools; they are concentrated fragments of stable realities that have not yet fully succumbed to the Unraveling. Each one is a memory of a physical law or a powerful concept\u2014the unbreakable defense of a Shield, the impossible speed of a Momentum Drive, the focused devastation of a Missile. By absorbing them, you temporarily impose these stable concepts onto your own existence.',
  'Aberration Cores: Controlled Chaos',
  'As you gain power and experience, you learn to do more than just defeat Aberrations\u2014you learn to resonate with their very essence. The Aberration Cores are stabilized fragments of their paradoxical existence, which you can attune to your own matrix. Equipping a Core forges a symbiotic link, granting you a fraction of an Aberration\'s unique power. It is a dangerous and powerful process: wielding the logic of chaos as a weapon against itself.',
  'The Mission',
  'Your journey is a desperate pilgrimage through the collapsing remnants of countless worlds. Each "stage" is a pocket of spacetime you temporarily stabilize through sheer force of will. The Ascension Conduit is your means of survival and growth.',
  'By defeating Aberrations, you are not merely destroying them; you are reclaiming lost fragments of reality\'s source code. By integrating these fragments into your own being through the Conduit, you grow stronger, turning the weapons of your enemy into the keys to your salvation.',
  "The Weaver's Orrery",
  "The Weaver's Orrery is your greatest tool. A mysterious device left by a precursor race, it allows you to manipulate the Echoes of Creation\u2014the residual energy left by powerful Aberrations.",
  'With the Orrery, you can forge custom timelines, simulating encounters against the multiverse\'s most dangerous threats. This is not mere practice; it is a way to hone your skills and prepare for the ultimate confrontation against the silent, all-consuming heart of the Unraveling.',
  'You are the final anchor in a storm of nonexistence. Hold the line. Maintain your momentum.'
];

function createLoreModal() {
  const modal = new THREE.Group();
  modal.name = 'lore';
  const w = 1.6;
  const h = 1.2;
  const borderPad = 0.05;
  modal.add(new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.35)));
  // Dark base and star overlay
  modal.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95)));
  modal.add(new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: starTexture, transparent: true, opacity: 0.15, depthWrite: false })
  ));
  const header = createTextSprite('LORE CODEX', 64, FONT_COLOR);
  header.position.set(0, 0.45, 0.01);
  modal.add(header);
  const bodyGroup = createTextBlock(storyParagraphs.join('\n'), 24, 42);
  bodyGroup.name = 'storyLines';
  bodyGroup.position.set(0, 0.35, 0.02);
  modal.add(bodyGroup);
  addScrollBar(modal, bodyGroup, 0.8, bodyGroup.userData.lineHeight);
  const closeBtn = createButton('Close', () => hideModal('lore'));
  closeBtn.position.set(0, -0.35, 0.02);
  modal.add(closeBtn);
  modal.visible = false;
  return modal;
}

function createBossInfoModal() {
  const modal = new THREE.Group();
  modal.name = 'bossInfo';
  const w = 1.6;
  const h = 1.2;
  const borderPad = 0.05;
  modal.add(new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.35)));
  // Dark base and star overlay
  modal.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95)));
  modal.add(new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: starTexture, transparent: true, opacity: 0.15, depthWrite: false })
  ));
  const title = createTextSprite('BOSS INFO', 64, FONT_COLOR);
  title.position.set(0, 0.45, 0.01);
  modal.add(title);
  const body = createTextSprite('', 24, FONT_COLOR);
  body.position.set(0, 0.15, 0.01);
  modal.add(body);
  const closeBtn = createButton('CLOSE', () => hideModal('bossInfo'));
  closeBtn.position.set(0, -0.35, 0.02);
  modal.add(closeBtn);
  modal.userData.title = title;
  modal.userData.body = body;
  modal.visible = false;
  return modal;
}

function createConfirmModal() {
  const modal = new THREE.Group();
  modal.name = 'confirm';
  const w = 1.2;
  const h = 0.8;
  const borderPad = 0.05;
  modal.add(new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.35)));
  // Dark base and star overlay
  modal.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95)));
  modal.add(new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: starTexture, transparent: true, opacity: 0.15, depthWrite: false })
  ));
  const title = createTextSprite('CONFIRM', 48, FONT_COLOR);
  title.position.set(0, 0.25, 0.01);
  modal.add(title);
  const body = createTextSprite('', 32, FONT_COLOR);
  body.position.set(0, 0.05, 0.01);
  modal.add(body);
  const yesBtn = createButton('Confirm', () => {
    hideModal('confirm');
    if (typeof confirmCallback === 'function') confirmCallback();
  });
  yesBtn.position.set(-0.3, -0.25, 0.02);
  modal.add(yesBtn);
  const noBtn = createButton('Cancel', () => hideModal('confirm'));
  noBtn.position.set(0.3, -0.25, 0.02);
  modal.add(noBtn);
  modal.userData.title = title;
  modal.userData.body = body;
  modal.visible = false;
  return modal;
}

let confirmCallback;

// API functions
export function startStage(stage) {
  applyAllTalentEffects();
  resetGame(false);
  if (typeof stage === 'number') state.currentStage = stage;
  state.isPaused = false;
  Object.values(modals).forEach(m => m.visible = false);
}

export function startOrrery(bossList) {
  applyAllTalentEffects();
  resetGame(true);
  state.arenaMode = true;
  state.customOrreryBosses = bossList;
  state.currentStage = 999;
  state.isPaused = false;
  Object.values(modals).forEach(m => m.visible = false);
}

export async function initModals(cam = getCamera()) {
  const group = ensureGroup(cam);
  if (!group || modals.gameOver) return;
  modals.gameOver = createModal('gameOver', 'TIMELINE COLLAPSED', [
    { label: 'Restart Stage', onSelect: () => startStage(state.currentStage) },
    { label: 'Ascension Conduit', onSelect: () => showModal('ascension') },
    { label: 'Aberration Cores', onSelect: () => showModal('cores') },
    { label: 'Stage Select', onSelect: () => showModal('levelSelect') }
  ]);
  group.add(modals.gameOver);
  modals.levelSelect = createStageSelectModal(); group.add(modals.levelSelect);
  modals.ascension = createAscensionModal(); group.add(modals.ascension);
  modals.cores = createCoresModal(); group.add(modals.cores);
  modals.orrery = createOrreryModal(); group.add(modals.orrery);
  modals.lore = createLoreModal(); group.add(modals.lore);
  modals.bossInfo = createBossInfoModal(); group.add(modals.bossInfo);
  modals.settings = createSettingsModal(); group.add(modals.settings);
  modals.home = createHomeModal(); group.add(modals.home);
  modals.confirm = createConfirmModal(); group.add(modals.confirm);
}

export function showModal(id) {
  ensureGroup();
  const cam = modalCamera || getCamera();
  Object.values(modals).forEach(m => { if (m) m.visible = false; });
  if (modals[id] && modalGroup && cam) {
    modalGroup.position.copy(cam.getWorldPosition(new THREE.Vector3()));
    modalGroup.quaternion.copy(cam.getWorldQuaternion(new THREE.Quaternion()));
    modals[id].visible = true;
    modals[id].position.set(0, 0, -1.5);
  }
}

export function hideModal(id) {
  if (modals[id]) modals[id].visible = false;
}

export function showHomeMenu() {
  if (!ensureGroup()) return;
  if (!modals.home) {
    modals.home = createHomeModal();
    modalGroup.add(modals.home);
  }
  if (modals.home.userData.updateButtons) modals.home.userData.updateButtons();
  showModal('home');
}

export function showConfirm(title, text, onConfirm) {
  ensureGroup();
  if (!modals.confirm) {
    modals.confirm = createConfirmModal();
    modalGroup.add(modals.confirm);
  }
  confirmCallback = onConfirm;
  if (modals.confirm) {
    updateTextSprite(modals.confirm.userData.title, title, FONT_COLOR);
    updateTextSprite(modals.confirm.userData.body, text, FONT_COLOR);
  }
  showModal('confirm');
}

export function showBossInfo(ids, type) {
  const bosses = ids.map(id => bossData.find(b => b.id === id)).filter(b => b);
  if (!bosses.length) return;
  let title = bosses.length > 1 ? bosses.map(b => b.name).join(' & ') : bosses[0].name;
  if (type === 'lore') title += ' - Lore ℹ️'; else title += ' - Mechanics ❔';
  const bodyText = bosses.map(b => type === 'lore' ? b.lore : b.mechanics_desc).join('\n\n');
  updateTextSprite(modals.bossInfo.userData.title, title, FONT_COLOR);
  updateTextSprite(modals.bossInfo.userData.body, bodyText, FONT_COLOR);
  showModal('bossInfo');
}

export function getModalObjects() {
  return Object.values(modals);
}

if (typeof window !== 'undefined') {
  window.showHomeMenu = showHomeMenu;
}
