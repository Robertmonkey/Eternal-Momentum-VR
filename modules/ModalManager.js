import * as THREE from '../vendor/three.module.js';
import { getCamera } from './scene.js';
import { resetGame, state, savePlayerState } from './state.js';
import { AudioManager } from './audio.js';
import { STAGE_CONFIG } from './config.js';
import { bossData } from './bosses.js';
import { applyAllTalentEffects, purchaseTalent } from './ascension.js';
import { TALENT_GRID_CONFIG } from './talents.js';
import { holoMaterial } from './UIManager.js';

/*
 * This file is a drop‑in replacement for the original ModalManager.js used in
 * Eternal Momentum VR.  It recreates the look and feel of the menus from the
 * classic Eternal Momentum game: darker panels with glowing cyan borders and
 * generous button widths.  Fonts, colours and button placements have been
 * carefully tuned to mirror the old game’s UI variables defined in style.css
 * (e.g. --dark-bg, --primary-glow, --font-color)【802164479894751†L0-L8】.  You can
 * replace your existing ModalManager.js with this file to update all VR
 * menu panels (Home, Stage Select, Ascension Conduit, Aberration Cores,
 * Weaver's Orrery, Lore Codex, Game Over, Boss Info, Settings and Confirm)
 * without affecting the hand‑held menu icons.
 */

// Colour constants matching the original game’s palette (style.css)
const DARK_BG_COLOR = 0x1e1e2f;      // matches --dark-bg【802164479894751†L0-L8】
const BORDER_COLOR  = 0x00ffff;      // matches --primary-glow【802164479894751†L0-L8】
const FONT_COLOR    = '#eaf2ff';     // matches --font-color【802164479894751†L0-L8】

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

/**
 * Create a text sprite for use in UI panels.  The sprite uses the
 * classic Eternal Momentum font stack (Segoe UI / Roboto) with
 * anti‑aliased canvas rendering.  Colour and size can be customised.
 *
 * @param {string} text - The text to render.
 * @param {number} size - Pixel height for the font (default 48).
 * @param {string} color - CSS colour for the text (default FONT_COLOR).
 */
function createTextSprite(text, size = 48, color = FONT_COLOR) {
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
  // Scale factor chosen to yield readable text in VR at default camera distance.
  const scale = 0.001;
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
  sprite.userData.ctx = ctx;
  sprite.userData.canvas = canvas;
  sprite.userData.font = `${size}px ${fontStack}`;
  return sprite;
}

/**
 * Update the contents of a text sprite.  Retains the original font and
 * size stored in the sprite’s userData.  Colour can be optionally
 * overridden.
 *
 * @param {THREE.Sprite} sprite
 * @param {string} text
 * @param {string} color
 */
function updateTextSprite(sprite, text, color = FONT_COLOR) {
  const ctx = sprite.userData.ctx;
  const canvas = sprite.userData.canvas;
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (sprite.userData.font) {
    ctx.font = sprite.userData.font;
  }
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, canvas.height / 2);
  sprite.material.map.needsUpdate = true;
}

/**
 * Create a button group composed of a bordered panel and text.  Buttons
 * automatically scale their width based on the label length: icon
 * buttons (e.g. ❔, ℹ️) remain compact while textual buttons expand
 * horizontally to provide ample click area reminiscent of the old game.
 * A subtle glowing border surrounds the button using the BORDER_COLOR.
 *
 * @param {string} label - Text or symbol displayed on the button.
 * @param {Function} onSelect - Callback invoked on selection.
 */
function createButton(label, onSelect) {
  const group = new THREE.Group();
  // Heuristically treat very short labels or single emojis as icon buttons
  const isIcon = label.length <= 2 && /[\p{Emoji}\p{Symbol}\p{Punctuation}]/u.test(label);
  // Determine dimensions: wide for text, narrow for icons
  const width = isIcon ? 0.4 : 1.2;
  const height = 0.2;
  const borderPad = 0.06;
  // Outer border plane – subtle glow around the button
  const border = new THREE.Mesh(
    new THREE.PlaneGeometry(width + borderPad, height + borderPad),
    holoMaterial(BORDER_COLOR, 0.4)
  );
  group.add(border);
  // Main button background
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    holoMaterial(DARK_BG_COLOR, 0.9)
  );
  group.add(bg);
  // Label text
  const textSize = isIcon ? 44 : 36;
  const text = createTextSprite(label, textSize, FONT_COLOR);
  text.position.set(0, 0, 0.01);
  group.add(text);
  // Store callback on the background mesh so raycaster can trigger it
  bg.userData.onSelect = onSelect;
  return group;
}

/**
 * Create a simple modal with a header and a vertical list of buttons.
 * The modal includes a border to match the old UI aesthetic.  This
 * function is used for the generic “Game Over” modal; other modals
 * have bespoke layouts defined below.
 *
 * @param {string} id - Unique name for the modal.
 * @param {string} title - Title text displayed at the top of the panel.
 * @param {Array<{label: string, onSelect: Function}>} buttons - Button definitions.
 */
function createModal(id, title, buttons) {
  const modal = new THREE.Group();
  modal.name = id;
  // Panel dimensions – slightly wider than the original (1.6 x 1) to fit wider buttons
  const w = 1.8;
  const h = 1.1;
  const borderPad = 0.08;
  // Border for the panel
  const border = new THREE.Mesh(
    new THREE.PlaneGeometry(w + borderPad, h + borderPad),
    holoMaterial(BORDER_COLOR, 0.4)
  );
  modal.add(border);
  // Background for the panel
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    holoMaterial(DARK_BG_COLOR, 0.95)
  );
  modal.add(bg);
  // Header
  const header = createTextSprite(title, 72, FONT_COLOR);
  header.position.set(0, 0.35, 0.01);
  modal.add(header);
  // Place each button with generous spacing
  buttons.forEach((btn, i) => {
    const b = createButton(btn.label, btn.onSelect);
    b.position.set(0, 0.15 - i * 0.35, 0.02);
    modal.add(b);
  });
  modal.visible = false;
  return modal;
}

// -----------------------------------------------------------------------------
// Below are bespoke modal constructors.  Their layouts mirror the originals
// defined in the VR project, but button sizes, spacing and colours are
// updated to the classic Eternal Momentum style.  Comments highlight
// sections that have been tweaked for fidelity.

function createSettingsModal() {
  const modal = new THREE.Group();
  modal.name = 'settings';
  // Larger settings panel
  const w = 1.8;
  const h = 1.3;
  const borderPad = 0.08;
  const border = new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.4));
  modal.add(border);
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95));
  modal.add(bg);
  // Header
  const header = createTextSprite('SETTINGS', 72, FONT_COLOR);
  header.position.set(0, 0.45, 0.01);
  modal.add(header);
  // Handedness toggle
  const handedSprite = createTextSprite(`Handed: ${state.settings.handedness}`, 40, FONT_COLOR);
  const handedBtn = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.2), holoMaterial(DARK_BG_COLOR, 0.9));
  // Border around handedness button
  const handedBorder = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + 0.06, 0.2 + 0.06), holoMaterial(BORDER_COLOR, 0.4));
  const handedGroup = new THREE.Group();
  handedGroup.add(handedBorder);
  handedGroup.add(handedBtn);
  handedSprite.position.set(0, 0, 0.01);
  handedGroup.add(handedSprite);
  handedBtn.userData.onSelect = () => {
    state.settings.handedness = state.settings.handedness === 'right' ? 'left' : 'right';
    updateTextSprite(handedSprite, `Handed: ${state.settings.handedness}`, FONT_COLOR);
    savePlayerState();
  };
  handedGroup.position.set(0, 0.15, 0.02);
  modal.add(handedGroup);
  // Volume controls helper
  function createVolumeControl(label, settingKey, yPos) {
    const group = new THREE.Group();
    const minus = createButton('-', () => adjust(-5));
    const plus = createButton('+', () => adjust(5));
    const display = createTextSprite(`${label}: ${state.settings[settingKey]}%`, 40, FONT_COLOR);
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
      updateTextSprite(display, `${label}: ${v}%`, FONT_COLOR);
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
  // Home button
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

function createHomeModal() {
  const modal = new THREE.Group();
  modal.name = 'home';
  const w = 2.0;
  const h = 1.3;
  const borderPad = 0.08;
  const border = new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.4));
  modal.add(border);
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95));
  modal.add(bg);
  const title = createTextSprite('ETERNAL MOMENTUM', 80, FONT_COLOR);
  title.position.set(0, 0.45, 0.01);
  modal.add(title);
  const startBtn = createButton('AWAKEN', () => {
    if (typeof window !== 'undefined' && window.startGame) {
      window.startGame(true);
    }
  });
  startBtn.name = 'startBtn';
  startBtn.position.set(0, 0.15, 0.02);
  modal.add(startBtn);
  const continueBtn = createButton('CONTINUE MOMENTUM', () => {
    if (typeof window !== 'undefined' && window.startGame) {
      window.startGame(false);
    }
  });
  continueBtn.name = 'continueBtn';
  continueBtn.position.set(0, -0.1, 0.02);
  modal.add(continueBtn);
  const eraseBtn = createButton('SEVER TIMELINE', () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('eternalMomentumSave');
      if (typeof window !== 'undefined' && window.location) {
        window.location.reload();
      }
    }
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
  const w = 2.0;
  const h = 1.5;
  const borderPad = 0.08;
  const border = new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.4));
  modal.add(border);
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95));
  modal.add(bg);
  const header = createTextSprite('SELECT STAGE', 72, FONT_COLOR);
  header.position.set(0, 0.55, 0.01);
  modal.add(header);
  // Codex access button (small icon sized to match old UI top‑right button)
  const loreBtn = createButton('LORE CODEX', () => showModal('lore'));
  loreBtn.position.set(0.65, 0.55, 0.02);
  modal.add(loreBtn);
  // List of stages
  const list = new THREE.Group();
  list.position.set(0, 0.35, 0.02);
  const maxStage = STAGE_CONFIG.length;
  for (let i = 1; i <= maxStage; i++) {
    const stageInfo = STAGE_CONFIG.find(s => s.stage === i);
    if (!stageInfo) continue;
    const row = new THREE.Group();
    row.name = `stage${i}`;
    const btn = createButton(`STAGE ${i}: ${stageInfo.displayName}`, () => startStage(i));
    row.add(btn);
    const mech = createButton('❔', () => showBossInfoModal(stageInfo.bosses, 'mechanics'));
    mech.position.set(0.7, 0, 0);
    row.add(mech);
    const lore = createButton('ℹ️', () => showBossInfoModal(stageInfo.bosses, 'lore'));
    lore.position.set(0.95, 0, 0);
    row.add(lore);
    row.position.set(0, -0.3 * (i - 1), 0);
    list.add(row);
  }
  modal.add(list);
  const orreryBtn = createButton("WEAVER'S ORRERY", () => showModal('orrery'));
  orreryBtn.position.set(0, -0.35, 0.02);
  modal.add(orreryBtn);
  const jumpBtn = createButton('JUMP TO FRONTIER', () => {
    const frontier = state.player.highestStageBeaten > 0 ? state.player.highestStageBeaten + 1 : 1;
    startStage(frontier);
  });
  jumpBtn.position.set(0, -0.6, 0.02);
  modal.add(jumpBtn);
  const closeBtn = createButton('Close', () => hideModal('levelSelect'));
  closeBtn.position.set(0, -0.85, 0.02);
  modal.add(closeBtn);
  modal.visible = false;
  return modal;
}

function createAscensionModal() {
  const modal = new THREE.Group();
  modal.name = 'ascension';
  const w = 2.0;
  const h = 1.6;
  const borderPad = 0.08;
  const border = new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.4));
  modal.add(border);
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95));
  modal.add(bg);
  const header = createTextSprite('ASCENSION CONDUIT', 72, FONT_COLOR);
  header.position.set(0, 0.55, 0.01);
  modal.add(header);
  const apDisplay = createTextSprite(`AP: ${state.player.ascensionPoints}`, 40, FONT_COLOR);
  apDisplay.position.set(0, 0.35, 0.01);
  modal.add(apDisplay);
  const grid = new THREE.Group();
  grid.position.set(0, 0.1, 0.02);
  const nodes = {};
  const width = 1.6;
  const height = 1.0;
  const infoGroup = new THREE.Group();
  infoGroup.position.set(0, -0.05, 0.02);
  const infoName = createTextSprite('', 40, FONT_COLOR);
  infoName.position.set(0, 0.12, 0.01);
  const infoDesc = createTextSprite('', 28, FONT_COLOR);
  infoDesc.position.set(0, 0, 0.01);
  const infoCost = createTextSprite('', 28, FONT_COLOR);
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
      if (bgMesh) {
        bgMesh.userData.onHover = () => showInfo(t);
      }
      const rank = createTextSprite(`0/${t.isInfinite ? '∞' : t.maxRanks}`, 28, FONT_COLOR);
      rank.position.set(0.2, 0, 0.01);
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
          const required = TALENT_GRID_CONFIG.core?.[pr]?.maxRanks ||
            Object.values(TALENT_GRID_CONFIG).find(c => c[pr])?.[pr].maxRanks || 0;
          const mat = new THREE.LineBasicMaterial({
            color: prereqRank >= required ? color : 0x444444,
            transparent: true,
            opacity: 0.6
          });
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
  if (nodes['core-nexus']) {
    showInfo(nodes['core-nexus'].talent);
  }
  const clearBtn = createButton('ERASE TIMELINE', () => {
    showConfirm(
      '|| SEVER TIMELINE? ||',
      'All Ascension progress and unlocked powers will be lost to the void. This action cannot be undone.',
      () => {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('eternalMomentumSave');
          if (typeof window !== 'undefined' && window.location && window.location.reload) {
            window.location.reload();
          }
        }
      }
    );
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
  const w = 2.0;
  const h = 1.7;
  const borderPad = 0.08;
  const border = new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.4));
  modal.add(border);
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95));
  modal.add(bg);
  const header = createTextSprite('ABERRATION CORES', 72, FONT_COLOR);
  header.position.set(0, 0.65, 0.01);
  modal.add(header);
  const equippedText = createTextSprite('Equipped: None', 40, FONT_COLOR);
  equippedText.position.set(0, 0.45, 0.01);
  modal.add(equippedText);
  const list = new THREE.Group();
  list.position.set(0, 0.3, 0.02);
  let index = 0;
  bossData.forEach(core => {
    if (!core.core_desc) return;
    const btn = createButton(core.name, () => equipCore(core.id));
    btn.position.set(0, -0.28 * index++, 0);
    list.add(btn);
  });
  modal.add(list);
  const unequipBtn = createButton('UNEQUIP CORE', () => equipCore(null));
  unequipBtn.position.set(0, -0.55, 0.02);
  modal.add(unequipBtn);
  const closeBtn2 = createButton('CLOSE', () => hideModal('cores'));
  closeBtn2.position.set(0, -0.8, 0.02);
  modal.add(closeBtn2);
  function equipCore(id) {
    state.player.equippedAberrationCore = id;
    const core = bossData.find(b => b.id === id);
    updateTextSprite(
      equippedText,
      `Equipped: ${core ? core.name : 'None'}`,
      FONT_COLOR
    );
    savePlayerState();
  }
  modal.visible = false;
  return modal;
}

function createOrreryModal() {
  const modal = new THREE.Group();
  modal.name = 'orrery';
  const w = 2.0;
  const h = 1.8;
  const borderPad = 0.08;
  const border = new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.4));
  modal.add(border);
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95));
  modal.add(bg);
  const header = createTextSprite("THE WEAVER'S ORRERY", 72, FONT_COLOR);
  header.position.set(0, 0.65, 0.01);
  modal.add(header);
  let totalEchoes = 0;
  const echoLabel = createTextSprite('ECHOES OF CREATION', 40, FONT_COLOR);
  echoLabel.position.set(0, 0.45, 0.01);
  modal.add(echoLabel);
  const points = createTextSprite(`${totalEchoes}`, 40, FONT_COLOR);
  points.position.set(0, 0.35, 0.01);
  modal.add(points);
  const bossList = new THREE.Group();
  bossList.name = 'bossList';
  bossList.position.set(0, 0.15, 0.02);
  modal.add(bossList);
  const rosterLabel = createTextSprite('TIMELINE ROSTER', 40, FONT_COLOR);
  rosterLabel.position.set(0, -0.05, 0.01);
  modal.add(rosterLabel);
  const selection = new THREE.Group();
  selection.name = 'selectionDisplay';
  selection.position.set(0, -0.25, 0.02);
  modal.add(selection);
  const costDisplay = createTextSprite('ECHOES SPENT: 0', 32, FONT_COLOR);
  costDisplay.position.set(0, -0.45, 0.01);
  modal.add(costDisplay);
  const clearBtn = createButton('CLEAR ROSTER', () => {
    selectedBosses = [];
    currentCost = 0;
    render();
  });
  clearBtn.position.set(0, -0.7, 0.02);
  modal.add(clearBtn);
  const startBtn = createButton('FORGE TIMELINE', () => startOrrery(selectedBosses));
  startBtn.name = 'startBtn';
  startBtn.position.set(0, -0.9, 0.02);
  modal.add(startBtn);
  const closeBtn = createButton('CLOSE', () => hideModal('orrery'));
  closeBtn.position.set(0, -1.1, 0.02);
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
    const available = bossData.filter(b => b.difficulty_tier).sort((a,b)=>a.difficulty_tier-b.difficulty_tier);
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
      const mech = createButton('❔', () => showBossInfoModal([boss.id], 'mechanics'));
      mech.position.set(0.7, 0, 0);
      row.add(mech);
      const lore = createButton('ℹ️', () => showBossInfoModal([boss.id], 'lore'));
      lore.position.set(0.95, 0, 0);
      row.add(lore);
      const cText = createTextSprite(String(cost), 28, FONT_COLOR);
      cText.position.set(1.1, 0, 0.01);
      row.add(cText);
      row.position.set(0, -0.3 * i, 0);
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
      btn.position.set(0, -0.25 * idx, 0);
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

const storyContent = 'Reality is fraying. You are the Conduit, last anchor against the Unraveling.';

function createLoreModal() {
  const modal = new THREE.Group();
  modal.name = 'lore';
  const w = 1.8;
  const h = 1.3;
  const borderPad = 0.08;
  const border = new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.4));
  modal.add(border);
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95));
  modal.add(bg);
  const header = createTextSprite('LORE CODEX', 72, FONT_COLOR);
  header.position.set(0, 0.45, 0.01);
  modal.add(header);
  const body = createTextSprite(storyContent, 32, FONT_COLOR);
  body.position.set(0, 0.15, 0.01);
  modal.add(body);
  const closeBtn = createButton('Close', () => hideModal('lore'));
  closeBtn.position.set(0, -0.35, 0.02);
  modal.add(closeBtn);
  modal.visible = false;
  return modal;
}

function createBossInfoModal() {
  const modal = new THREE.Group();
  modal.name = 'bossInfo';
  const w = 1.8;
  const h = 1.3;
  const borderPad = 0.08;
  const border = new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.4));
  modal.add(border);
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95));
  modal.add(bg);
  const title = createTextSprite('BOSS INFO', 72, FONT_COLOR);
  title.position.set(0, 0.45, 0.01);
  modal.add(title);
  const body = createTextSprite('', 32, FONT_COLOR);
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
  const w = 1.4;
  const h = 0.9;
  const borderPad = 0.08;
  const border = new THREE.Mesh(new THREE.PlaneGeometry(w + borderPad, h + borderPad), holoMaterial(BORDER_COLOR, 0.4));
  modal.add(border);
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), holoMaterial(DARK_BG_COLOR, 0.95));
  modal.add(bg);
  const title = createTextSprite('CONFIRM', 64, FONT_COLOR);
  title.position.set(0, 0.25, 0.01);
  modal.add(title);
  const body = createTextSprite('', 40, FONT_COLOR);
  body.position.set(0, 0.05, 0.01);
  modal.add(body);
  const yesBtn = createButton('Confirm', () => {
    hideModal('confirm');
    if (typeof confirmCallback === 'function') confirmCallback();
  });
  yesBtn.position.set(-0.35, -0.25, 0.02);
  modal.add(yesBtn);
  const noBtn = createButton('Cancel', () => hideModal('confirm'));
  noBtn.position.set(0.35, -0.25, 0.02);
  modal.add(noBtn);
  modal.userData.title = title;
  modal.userData.body = body;
  modal.visible = false;
  return modal;
}

// Internal variable used by confirm modal
let confirmCallback;

// -----------------------------------------------------------------------------
// Public API – functions exported from the original ModalManager.js are
// preserved.  They delegate to our updated UI constructors above but
// otherwise behave identically.

export function startStage(stage) {
  applyAllTalentEffects();
  resetGame(false);
  if (typeof stage === 'number') {
    state.currentStage = stage;
  }
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
  modals.levelSelect = createStageSelectModal();
  group.add(modals.levelSelect);
  modals.ascension = createAscensionModal();
  group.add(modals.ascension);
  modals.cores = createCoresModal();
  group.add(modals.cores);
  modals.orrery = createOrreryModal();
  group.add(modals.orrery);
  modals.lore = createLoreModal();
  group.add(modals.lore);
  modals.bossInfo = createBossInfoModal();
  group.add(modals.bossInfo);
  modals.settings = createSettingsModal();
  group.add(modals.settings);
  modals.home = createHomeModal();
  group.add(modals.home);
  modals.confirm = createConfirmModal();
  group.add(modals.confirm);
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

export function showHomeMenu() {
  if (!ensureGroup()) {
    return;
  }
  if (!modals.home) {
    modals.home = createHomeModal();
    modalGroup.add(modals.home);
  }
  if (modals.home.userData.updateButtons) {
    modals.home.userData.updateButtons();
  }
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
  // Use the existing function to set body and title; implement here inline
  const bosses = ids.map(id => bossData.find(b => b.id === id)).filter(b => b);
  if (!bosses.length) return;
  let title = bosses.length > 1 ? bosses.map(b => b.name).join(' & ') : bosses[0].name;
  if (type === 'lore') {
    title += ' - Lore ℹ️';
  } else {
    title += ' - Mechanics ❔';
  }
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
