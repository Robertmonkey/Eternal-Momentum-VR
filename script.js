/*
 * script.js – VR runtime for Eternal Momentum
 *
 * This version completely rewrites the original prototype to address
 * numerous design flaws reported by beta testers.  It re‑positions
 * all UI panels around the command deck, ensures all gameplay entities
 * are spawned on the spherical battlefield, starts stages correctly,
 * and exposes the boss health bar as a 3D element.
 *
 * The code imports the 2D game logic from the modules in the
 * `modules/` directory and adapts it to a 3D spherical coordinate system.
 */

import { gameTick, spawnBossesForStage } from './modules/gameLoop.js';
import { state, resetGame, savePlayerState } from './modules/state.js';
import { activateCorePower } from './modules/cores.js';
import { powers, usePower } from './modules/powers.js';
import { applyAllTalentEffects, renderAscensionGrid } from './modules/ascension.js';
import { populateAberrationCoreMenu, populateOrreryMenu, populateLoreCodex, showBossInfo } from './modules/ui.js';
import { STAGE_CONFIG } from './modules/config.js';
import { AudioManager } from './modules/audio.js';
import { uvToSpherePos, spherePosToUv } from './modules/utils.js';
import { moveTowards } from './modules/movement3d.js';

// Register a component that applies a 2D canvas as a live texture on a mesh.
AFRAME.registerComponent('canvas-texture', {
  schema: { type: 'selector' },
  init: function () {
    const canvas = this.data;
    if (!canvas) {
      console.error('canvas-texture: target canvas not found');
      return;
    }
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.el.addEventListener('model-loaded', () => this.applyTexture());
    if (this.el.getObject3D('mesh')) this.applyTexture();
  },
  applyTexture: function () {
    const mesh = this.el.getObject3D('mesh');
    if (!mesh) return;
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach(mat => {
        mat.map = this.texture;
        mat.needsUpdate = true;
      });
    } else {
      material.map = this.texture;
      material.needsUpdate = true;
    }
  },
  tick: function () {
    if (this.texture) this.texture.needsUpdate = true;
  }
});

// Once the DOM is ready, initialise VR‑specific state and event handlers.
window.addEventListener('load', () => {
  // Offscreen canvas to support legacy modules.  It is never shown in VR.
  let canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    canvas.width = 2048;
    canvas.height = 1024;
  }
  const ctx = canvas.getContext('2d');
  const gridCanvas = document.getElementById('gridCanvas');
  if (gridCanvas) {
    const gctx = gridCanvas.getContext('2d');
    const size = gridCanvas.width;
    gctx.clearRect(0, 0, size, size);
    gctx.strokeStyle = '#00ffff';
    gctx.lineWidth = 2;
    const step = size / 8;
    for (let i = 0; i <= 8; i++) {
      gctx.beginPath();
      gctx.moveTo(i * step, 0);
      gctx.lineTo(i * step, size);
      gctx.moveTo(0, i * step);
      gctx.lineTo(size, i * step);
      gctx.stroke();
    }
  }

  // Initialise core game state for a fresh run.
  resetGame(false);
  applyAllTalentEffects();
  state.currentStage = state.currentStage || 1;

  // VR meta state: track core cooldown usage and pointer UV.
  const gameState = {
    lastCoreUse: -Infinity,
    cursorUV: null,
    cursorPoint: null
  };

  // Start the initial stage after the scene has stabilised
  setTimeout(restartCurrentStage, 500);

  // Cache important elements for quick access.
  const scoreText       = document.getElementById('scoreText');
  const healthText      = document.getElementById('healthText');
  const levelText       = document.getElementById('levelText');
  const stageText       = document.getElementById('stageText');
  const apText          = document.getElementById('apText');
  const statusText      = document.getElementById('statusText');
  const offPowerText    = document.getElementById('offPowerText');
  const offPowerQueueText = document.getElementById('offPowerQueueText');
  const defPowerText    = document.getElementById('defPowerText');
  const defPowerQueueText = document.getElementById('defPowerQueueText');
  const statusEffectsText = document.getElementById('statusEffectsText');
  const vignetteRing    = document.getElementById('vignette');
  const bossPanel       = document.getElementById('bossPanel');
  const bossNameText    = document.getElementById('bossNameText');
  const bossHpBarWrap   = document.getElementById('bossHpBarWrap');
  const bossHpBarFill   = document.getElementById('bossHpBarFill');
  const commandDeck     = document.getElementById('commandDeck');
  const commandDeckEnv  = document.getElementById('commandDeckEnv');
  const cameraEl        = document.getElementById('camera');
  const sceneEl         = document.querySelector('a-scene');
  const battleSphere    = document.getElementById('battleSphere');
  const screenCursor    = document.getElementById('screenCursor');
  const nexusAvatar     = document.getElementById('nexusAvatar');
  const enemyContainer  = document.getElementById('enemyContainer');
  const projectileContainer = document.getElementById('projectileContainer');
  const pickupContainer    = document.getElementById('pickupContainer');
  const leftHand        = document.getElementById('leftHand');
  const rightHand       = document.getElementById('rightHand');
  const coreModel       = document.getElementById('coreModel');
  const coreCooldownRing = document.getElementById('coreCooldownRing');
  const coreCooldownPanel = document.getElementById('coreCooldownPanel');
  const cooldownText    = document.getElementById('cooldownText');

  const projectileMap = new Map();
  const pickupMap = new Map();

  const SPHERE_RADIUS   = 8;

  // Position of the player's avatar on the sphere.
  let avatarPos = uvToSpherePos(0.5, 0.5, SPHERE_RADIUS);
  const startUv = spherePosToUv(avatarPos);
  state.player.x = startUv.u * canvas.width;
  state.player.y = startUv.v * canvas.height;

  // Utility to arrange panels around the command deck.  Adjust angles and
  // radii so nothing overlaps and everything is within easy reach.
  function arrangeUiPanels() {
    const panels = [
      { el: document.getElementById('scorePanel'),         angle: -20, r: 1.8, y: 1.1 },
      { el: document.getElementById('offPowerPanel'),      angle: -50, r: 2.0, y: 1.1 },
      { el: document.getElementById('defPowerPanel'),      angle:  50, r: 2.0, y: 1.1 },
      { el: document.getElementById('statusEffectsPanel'), angle:  20, r: 1.8, y: 1.1 },
      { el: document.getElementById('resetButton'),        angle: -35, r: 2.4, y: 0.9 },
      { el: document.getElementById('pauseToggle'),        angle: -35, r: 2.4, y: 1.05 },
      { el: document.getElementById('stageSelectToggle'),  angle: -35, r: 2.4, y: 1.20 },
      { el: document.getElementById('coreMenuToggle'),     angle: -25, r: 2.6, y: 1.45 },
      { el: document.getElementById('ascensionToggle'),    angle:  25, r: 2.6, y: 1.65 },
      { el: document.getElementById('codexToggle'),        angle:  35, r: 2.5, y: 1.85 },
      { el: document.getElementById('orreryToggle'),       angle:  35, r: 2.5, y: 2.05 },
      { el: document.getElementById('soundOptionsToggle'), angle:  35, r: 2.4, y: 2.25 }
    ];
    panels.forEach(p => {
      if (!p.el) return;
      const rad = THREE.MathUtils.degToRad(p.angle);
      const x   = Math.sin(rad) * p.r;
      const z   = -Math.cos(rad) * p.r;
      p.el.setAttribute('position', `${x} ${p.y} ${z}`);
      p.el.setAttribute('rotation', `0 ${p.angle} 0`);
    });
  }

  // Align the command deck vertically relative to the player's head height.
  function alignCommandDeck() {
    const headY = cameraEl.object3D.position.y || 1.6;
    if (commandDeck)     commandDeck.object3D.position.y    = headY - 0.5;
    if (commandDeckEnv)  commandDeckEnv.object3D.position.y = headY - 1.6;
    const panelY = headY;
    const panelIds = [
      'stageSelectPanel','gameOverPanel','bossInfoPanel','ascensionGridPanel',
      'aberrationCorePanel','loreCodexPanel','orreryPanel','soundOptionsPanel'
    ];
    panelIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.object3D.position.y = panelY;
    });
  }

  // Capture a DOM modal and apply it as a texture on a VR panel.
  async function applyModalTexture(panelEl, modalEl, canvasId) {
    if (!panelEl || !modalEl || typeof html2canvas === 'undefined') return;
    const prev = modalEl.style.display;
    modalEl.style.display = 'block';
    let canvas = document.getElementById(canvasId);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = canvasId;
      document.body.appendChild(canvas);
    }
    await html2canvas(modalEl, { backgroundColor: null, canvas });
    modalEl.style.display = prev;
    panelEl.setAttribute('canvas-texture', `#${canvasId}`);
    panelEl.setAttribute('material', 'transparent:true');
  }

  function showPanel(panelEl) {
    if (!panelEl) return;
    panelEl.setAttribute('visible', 'true');
  }

  // Start the selected stage by resetting and spawning enemies/bosses.
  function restartCurrentStage() {
    resetGame(false);
    applyAllTalentEffects();
    gameState.lastCoreUse = -Infinity;
    // centre the avatar on the sphere and sync UV.
    avatarPos = uvToSpherePos(0.5, 0.5, SPHERE_RADIUS);
    const uv0 = spherePosToUv(avatarPos);
    state.player.x = uv0.u * canvas.width;
    state.player.y = uv0.v * canvas.height;
    // Validate the current stage and spawn contents.
    if (!state.currentStage || state.currentStage < 1 || state.currentStage > STAGE_CONFIG.length) {
      state.currentStage = 1;
    }
    try {
      spawnBossesForStage(state.currentStage);
    } catch (err) {
      console.warn('Error spawning stage contents', err);
    }
    updateUI();
  }

  // Update textual UI and boss health bar every frame.
  function updateUI() {
    const essence = state.player.essence ?? 0;
    scoreText.setAttribute('value', `Essence: ${Math.floor(essence)}`);
    const health = state.player.health ?? 0;
    healthText.setAttribute('value', `Health: ${Math.floor(health)}`);
    levelText.setAttribute('value', `Level: ${state.player.level}`);
    stageText.setAttribute('value', `Stage: ${state.currentStage}`);
    if (apText) apText.setAttribute('value', `AP: ${state.player.ascensionPoints}`);

    // Display equipped powers and queue
    if (offPowerText) {
      const off = state.offensiveInventory[0];
      offPowerText.setAttribute('value', off ? powers[off].emoji : '');
    }
    if (defPowerText) {
      const def = state.defensiveInventory[0];
      defPowerText.setAttribute('value', def ? powers[def].emoji : '');
    }
    if (offPowerQueueText) {
      const q = state.offensiveInventory.slice(1).map(p => p ? powers[p].emoji : '').join(' ');
      offPowerQueueText.setAttribute('value', q);
    }
    if (defPowerQueueText) {
      const q = state.defensiveInventory.slice(1).map(p => p ? powers[p].emoji : '').join(' ');
      defPowerQueueText.setAttribute('value', q);
    }
    if (statusEffectsText) {
      const icons = state.player.statusEffects.filter(e => Date.now() < e.endTime).map(e => e.emoji).join(' ');
      statusEffectsText.setAttribute('value', icons);
    }
    // Vignette effect on low health
    if (vignetteRing && state.player.maxHealth) {
      const ratio = Math.max(0, Math.min(1, health / state.player.maxHealth));
      const opacity = Math.min(0.6, (1 - ratio) * (1 - ratio) * 0.8);
      vignetteRing.setAttribute('visible', opacity > 0.01);
      vignetteRing.setAttribute('material', 'opacity', opacity);
    }
    // Boss health bar: compute ratio from boss HP values in game state
    if (bossPanel && bossHpBarFill) {
      // Determine the active boss.  In the current implementation the
      // boss is stored in state.bosses array for the current stage.  If
      // multiple bosses exist, use the first.  Fallback to hidden bar
      // when no boss is alive.
      const activeBoss = (state.enemies || []).find(e => e.isBoss);
      if (activeBoss && activeBoss.maxHP) {
        bossPanel.setAttribute('visible', 'true');
        bossNameText.setAttribute('value', activeBoss.name);
        const ratio = Math.max(0, activeBoss.hp / activeBoss.maxHP);
        // update bar width via scale on X; original width is 1.0
        // anchor the fill to the left by repositioning: the wrapper is 1.6 units wide and
        // its left edge sits at x = -0.8.  When scaling the inner bar we want it to
        // grow from the left edge, so we update its x position accordingly.
        bossHpBarFill.object3D.scale.x = ratio;
        bossHpBarFill.object3D.position.x = -0.8 + ratio * 0.8;
        // colour code based on ratio – blue at high health, yellow at mid, red at low
        const colour = ratio > 0.6 ? '#3498db' : ratio > 0.3 ? '#f1c40f' : '#e74c3c';
        bossHpBarFill.setAttribute('material', 'color', colour);
      } else {
        bossPanel.setAttribute('visible', 'false');
      }
    }
    updateCoreModelVisibility();
    updateCoreCooldownDisplay();
  }

  function updateCoreModelVisibility() {
    const hasCore = state.player.unlockedAberrationCores.size > 0;
    if (coreModel) coreModel.setAttribute('visible', hasCore);
    if (coreCooldownRing) coreCooldownRing.setAttribute('visible', hasCore);
    if (coreCooldownPanel) coreCooldownPanel.setAttribute('visible', hasCore);
  }

  function updateCoreCooldownDisplay() {
    if (!coreCooldownPanel || !cooldownText || !coreCooldownRing) return;
    const coreId = state.player.equippedAberrationCore;
    if (!coreId) {
      cooldownText.setAttribute('value', 'No Core Equipped');
      coreCooldownRing.object3D.scale.set(0, 0, 0);
      return;
    }
    const coreState = state.player.talent_states.core_states[coreId] || {};
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
      splitter: 500
    };
    const now = Date.now();
    const end = coreState.cooldownUntil || 0;
    const duration = cooldowns[coreId];
    if (!duration || now >= end) {
      cooldownText.setAttribute('value', 'Core cooldown: Ready');
      coreCooldownRing.object3D.scale.set(1, 1, 1);
      return;
    }
    const remaining = Math.max(0, end - now);
    const progress = remaining / duration;
    cooldownText.setAttribute('value', `Core cooldown: ${Math.ceil(remaining / 1000)}s`);
    coreCooldownRing.object3D.scale.set(progress, progress, progress);
  }

  // Event handlers for menu buttons.  These open the respective modals and
  // panels defined in the DOM.  They mirror the behaviour of the 2D
  // interface but are adapted for VR.
  const coreMenuToggle     = document.getElementById('coreMenuToggle');
  const aberrationCorePanel = document.getElementById('aberrationCorePanel');
  const closeAberrationCoreBtn = document.getElementById('closeAberrationCoreBtn');
  const unequipCoreBtn     = document.getElementById('unequipCoreBtn');
  const ascensionToggle    = document.getElementById('ascensionToggle');
  const ascensionGridPanel = document.getElementById('ascensionGridPanel');
  const closeAscensionGridBtn = document.getElementById('closeAscensionGridBtn');
  const codexToggle        = document.getElementById('codexToggle');
  const loreCodexPanel     = document.getElementById('loreCodexPanel');
  const closeLoreCodexBtn  = document.getElementById('closeLoreCodexBtn');
  const orreryToggle       = document.getElementById('orreryToggle');
  const orreryPanel        = document.getElementById('orreryPanel');
  const closeOrreryBtn     = document.getElementById('closeOrreryBtn');
  const soundOptionsToggle = document.getElementById('soundOptionsToggle');
  const soundOptionsPanel  = document.getElementById('soundOptionsPanel');
  const closeSoundOptionsBtn = document.getElementById('closeSoundOptionsBtn');
  const musicVolume        = document.getElementById('musicVolume');
  const sfxVolume          = document.getElementById('sfxVolume');
  const muteToggle         = document.getElementById('muteToggle');
  const pauseToggle        = document.getElementById('pauseToggle');
  const pauseText          = document.getElementById('pauseText');
  const soundIconText      = document.getElementById('soundIconText');
  const resetButton        = document.getElementById('resetButton');
  const stageSelectToggle  = document.getElementById('stageSelectToggle');
  const stageSelectPanel   = document.getElementById('stageSelectPanel');
  const stageSelectLabel   = document.getElementById('stageSelectLabel');
  const prevStageBtn       = document.getElementById('prevStageBtn');
  const nextStageBtn       = document.getElementById('nextStageBtn');
  const startStageBtn      = document.getElementById('startStageBtn');
  const stageMechanicsBtn  = document.getElementById('stageMechanicsBtn');
  const stageLoreBtn       = document.getElementById('stageLoreBtn');
  const restartStageBtn    = document.getElementById('restartStageBtn');
  const gameOverPanel      = document.getElementById('gameOverPanel');
  const levelSelectMenuBtn = document.getElementById('levelSelectMenuBtn');
  const ascensionMenuBtn   = document.getElementById('ascensionMenuBtn');
  const aberrationCoreMenuBtn = document.getElementById('aberrationCoreMenuBtn');

  let selectedStage = state.currentStage;

  // Stage selection helpers
  function updateStageSelectDisplay() {
    if (stageSelectLabel) stageSelectLabel.setAttribute('value', `Stage: ${selectedStage}`);
  }

  // Event listeners for stage selection
  if (prevStageBtn) prevStageBtn.addEventListener('click', () => {
    selectedStage = Math.max(1, selectedStage - 1);
    updateStageSelectDisplay();
  });
  if (nextStageBtn) nextStageBtn.addEventListener('click', () => {
    selectedStage = Math.min(STAGE_CONFIG.length, selectedStage + 1);
    updateStageSelectDisplay();
  });
  if (startStageBtn) startStageBtn.addEventListener('click', () => {
    state.currentStage = selectedStage;
    restartCurrentStage();
    stageSelectPanel.setAttribute('visible', 'false');
  });
  if (stageMechanicsBtn) stageMechanicsBtn.addEventListener('click', () => {
    const cfg = STAGE_CONFIG.find(s => s.stage === selectedStage);
    if (cfg) showBossInfo(cfg.bosses, 'mechanics');
  });
  if (stageLoreBtn) stageLoreBtn.addEventListener('click', () => {
    const cfg = STAGE_CONFIG.find(s => s.stage === selectedStage);
    if (cfg) showBossInfo(cfg.bosses, 'lore');
  });

  // Menu toggles
  if (coreMenuToggle) coreMenuToggle.addEventListener('click', async () => {
    populateAberrationCoreMenu(coreId => {
      state.player.equippedAberrationCore = coreId;
      savePlayerState();
      applyAllTalentEffects();
      populateAberrationCoreMenu(() => {});
      updateUI();
    });
    await applyModalTexture(aberrationCorePanel,
      document.getElementById('aberrationCoreModal'),
      'aberrationCoreCanvas');
    showPanel(aberrationCorePanel);
    AudioManager.playSfx('uiModalOpen');
  });
  if (closeAberrationCoreBtn) closeAberrationCoreBtn.addEventListener('click', () => {
    aberrationCorePanel.setAttribute('visible', 'false');
    AudioManager.playSfx('uiModalClose');
  });
  if (unequipCoreBtn) unequipCoreBtn.addEventListener('click', () => {
    state.player.equippedAberrationCore = null;
    savePlayerState();
    applyAllTalentEffects();
    populateAberrationCoreMenu(() => {});
    aberrationCorePanel.setAttribute('visible', 'false');
    AudioManager.playSfx('uiModalClose');
    updateUI();
  });
  if (ascensionToggle) ascensionToggle.addEventListener('click', async () => {
    renderAscensionGrid();
    await applyModalTexture(ascensionGridPanel,
      document.getElementById('ascensionGridModal'),
      'ascensionGridCanvas');
    showPanel(ascensionGridPanel);
    AudioManager.playSfx('uiModalOpen');
  });
  if (closeAscensionGridBtn) closeAscensionGridBtn.addEventListener('click', () => {
    ascensionGridPanel.setAttribute('visible', 'false');
    AudioManager.playSfx('uiModalClose');
  });
  if (codexToggle) codexToggle.addEventListener('click', async () => {
    populateLoreCodex();
    await applyModalTexture(loreCodexPanel,
      document.getElementById('loreCodexModal'),
      'loreCodexCanvas');
    showPanel(loreCodexPanel);
    AudioManager.playSfx('uiModalOpen');
  });
  if (closeLoreCodexBtn) closeLoreCodexBtn.addEventListener('click', () => {
    loreCodexPanel.setAttribute('visible', 'false');
    AudioManager.playSfx('uiModalClose');
  });
  if (orreryToggle) orreryToggle.addEventListener('click', async () => {
    populateOrreryMenu(bossList => {
      // Custom orrery encounter logic: reset and spawn selected bosses
      resetGame(true);
      state.customOrreryBosses = bossList;
      state.currentStage = 999;
      gameState.lastCoreUse = -Infinity;
      avatarPos = uvToSpherePos(0.5, 0.5, SPHERE_RADIUS);
      const uv0 = spherePosToUv(avatarPos);
      state.player.x = uv0.u * canvas.width;
      state.player.y = uv0.v * canvas.height;
      updateUI();
    });
    await applyModalTexture(orreryPanel,
      document.getElementById('orreryModal'),
      'orreryCanvas');
    showPanel(orreryPanel);
    AudioManager.playSfx('uiModalOpen');
  });
  if (closeOrreryBtn) closeOrreryBtn.addEventListener('click', () => {
    orreryPanel.setAttribute('visible', 'false');
    AudioManager.playSfx('uiModalClose');
  });
  if (soundOptionsToggle) soundOptionsToggle.addEventListener('click', async () => {
    musicVolume.value = AudioManager.musicVolume;
    sfxVolume.value   = AudioManager.sfxVolume;
    muteToggle.innerText = AudioManager.userMuted ? 'Unmute' : 'Mute';
    await applyModalTexture(soundOptionsPanel,
      document.getElementById('soundOptionsModal'),
      'soundOptionsCanvas');
    showPanel(soundOptionsPanel);
    AudioManager.playSfx('uiModalOpen');
  });
  if (closeSoundOptionsBtn) closeSoundOptionsBtn.addEventListener('click', () => {
    soundOptionsPanel.setAttribute('visible', 'false');
    AudioManager.playSfx('uiModalClose');
  });
  if (muteToggle) muteToggle.addEventListener('click', () => {
    AudioManager.toggleMute();
    muteToggle.innerText = AudioManager.userMuted ? 'Unmute' : 'Mute';
    if (soundIconText) soundIconText.setAttribute('value', AudioManager.userMuted ? '🔇' : '🔊');
  });
  if (musicVolume) musicVolume.addEventListener('input', e => AudioManager.setMusicVolume(parseFloat(e.target.value)));
  if (sfxVolume) sfxVolume.addEventListener('input', e => AudioManager.setSfxVolume(parseFloat(e.target.value)));

  if (pauseToggle) pauseToggle.addEventListener('click', () => {
    state.paused = !state.paused;
    pauseText.setAttribute('value', state.paused ? '▶' : '⏸');
    // When unpausing, restart the stage to re‑spawn enemies if necessary
    if (!state.paused) restartCurrentStage();
  });
  if (resetButton) resetButton.addEventListener('click', () => {
    restartCurrentStage();
  });
  if (stageSelectToggle) stageSelectToggle.addEventListener('click', () => {
    selectedStage = state.currentStage;
    updateStageSelectDisplay();
    showPanel(stageSelectPanel);
  });

  if (restartStageBtn) restartStageBtn.addEventListener('click', () => {
    restartCurrentStage();
  });
  if (levelSelectMenuBtn && stageSelectToggle) levelSelectMenuBtn.addEventListener('click', () => {
    stageSelectToggle.emit('click');
  });
  if (ascensionMenuBtn && ascensionToggle) ascensionMenuBtn.addEventListener('click', () => {
    ascensionToggle.emit('click');
  });
  if (aberrationCoreMenuBtn && coreMenuToggle) aberrationCoreMenuBtn.addEventListener('click', () => {
    coreMenuToggle.emit('click');
  });

  // Set up haptic feedback
  function triggerHaptic(el, intensity = 0.5, duration = 50) {
    const controller = el?.components['laser-controls']?.controller || el?.components['tracked-controls']?.controller;
    const actuator  = controller?.hapticActuators?.[0];
    if (actuator && actuator.pulse) {
      actuator.pulse(intensity, duration).catch(() => {});
    } else if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  }
  function pulseBoth(intensity = 0.5, duration = 50) {
    if (leftHand) triggerHaptic(leftHand, intensity, duration);
    if (rightHand) triggerHaptic(rightHand, intensity, duration);
  }
  AudioManager.setup(Array.from(document.querySelectorAll('.game-audio')), muteToggle);
  if (soundIconText) soundIconText.setAttribute('value', AudioManager.userMuted ? '🔇' : '🔊');

  // Attach hover/click feedback to all console buttons
  function attachConsoleButtonFeedback() {
    const btns = document.querySelectorAll('[mixin="console-button"]');
    btns.forEach(btn => {
      btn.addEventListener('mouseenter', () => AudioManager.playSfx('uiHoverSound'));
      btn.addEventListener('click', () => {
        AudioManager.playSfx('uiClickSound');
        pulseBoth(0.6, 40);
      });
    });
  }
  attachConsoleButtonFeedback();

  // --------------------------------------------------------------
  // VR Controller Input for Powers and Core Abilities
  // --------------------------------------------------------------
  let leftTriggerDown = false;
  let rightTriggerDown = false;
  const TRIGGER_DELAY = 120;

  function getCursorCoords() {
    const uv = gameState.cursorUV || spherePosToUv(avatarPos);
    return { mx: uv.u * canvas.width, my: uv.v * canvas.height };
  }

  function tryActivateCore() {
    if (leftTriggerDown && rightTriggerDown) {
      const { mx, my } = getCursorCoords();
      try { activateCorePower(mx, my, window.gameHelpers); } catch (err) { console.error(err); }
      pulseBoth(0.8, 60);
      leftTriggerDown = false; rightTriggerDown = false;
      return true;
    }
    return false;
  }

  function schedulePowerCheck(isLeft) {
    const start = Date.now();
    setTimeout(() => {
      if (isLeft ? leftTriggerDown && !rightTriggerDown : rightTriggerDown && !leftTriggerDown) {
        if (!tryActivateCore()) {
          const { mx, my } = getCursorCoords();
          const key = isLeft ? state.offensiveInventory[0] : state.defensiveInventory[0];
          if (key) { usePower(key); pulseBoth(0.5, 40); }
        }
      }
    }, TRIGGER_DELAY);
  }

  if (leftHand) {
    leftHand.addEventListener('triggerdown', () => { leftTriggerDown = true; schedulePowerCheck(true); });
    leftHand.addEventListener('triggerup',   () => { leftTriggerDown = false; });
  }
  if (rightHand) {
    rightHand.addEventListener('triggerdown', () => { rightTriggerDown = true; schedulePowerCheck(false); });
    rightHand.addEventListener('triggerup',   () => { rightTriggerDown = false; });
  }

  // Align the command deck initially and whenever entering/exiting VR.
  const applyLayout = () => { alignCommandDeck(); arrangeUiPanels(); };
  applyLayout();
  window.addEventListener('resize', applyLayout);
  if (sceneEl) {
    if (sceneEl.hasLoaded) applyLayout();
    else sceneEl.addEventListener('loaded', applyLayout, { once: true });
    sceneEl.addEventListener('enter-vr', () => {
      applyLayout();
      restartCurrentStage();
    });
    sceneEl.addEventListener('exit-vr', applyLayout);
  }

  // Handle raycaster hits on the battle sphere.  The cursor is projected onto
  // the inner surface and clicking moves the avatar smoothly towards it.
  if (battleSphere) {
    battleSphere.addEventListener('raycaster-intersection', e => {
      const hit = e.detail.intersections[0];
      if (hit && hit.uv) {
        gameState.cursorUV = hit.uv;
        gameState.cursorPoint = hit.point.clone();
        if (screenCursor) {
          screenCursor.object3D.position.copy(hit.point);
          screenCursor.object3D.lookAt(cameraEl.object3D.position);
          screenCursor.setAttribute('visible', 'true');
        }
      }
    });
    battleSphere.addEventListener('raycaster-intersection-cleared', e => {
      if (e.detail.clearedEl === battleSphere) {
        gameState.cursorUV   = null;
        gameState.cursorPoint = null;
        if (screenCursor) screenCursor.setAttribute('visible', 'false');
      }
    });
    battleSphere.addEventListener('click', e => {
      const uv = e.detail.intersection?.uv || gameState.cursorUV;
      const pt = e.detail.intersection?.point || gameState.cursorPoint;
      if (uv && pt) {
        avatarPos.copy(pt).normalize().multiplyScalar(SPHERE_RADIUS);
        const conv = spherePosToUv(avatarPos);
        state.player.x = conv.u * canvas.width;
        state.player.y = conv.v * canvas.height;
      }
    });
  }

  // Animation loop: update game logic and 3D positions every frame.
  function animate() {
    // Determine the current cursor position on the 2D canvas.  When the
    // raycaster is hitting the gameplay sphere we convert the UV back to
    // pixel coordinates.  Otherwise fall back to the avatar's location so
    // logic that relies on mx/my continues to work.
    let mx, my;
    if (gameState.cursorUV) {
      mx = gameState.cursorUV.x * canvas.width;
      my = gameState.cursorUV.y * canvas.height;
    } else {
      const uv = spherePosToUv(avatarPos);
      mx = uv.u * canvas.width;
      my = uv.v * canvas.height;
    }

    // Advance the core 2D game simulation with the mapped coordinates
    try { gameTick(mx, my); } catch (err) { console.error(err); }
    // Move the avatar gradually toward the cursor using the 3D momentum formula
    if (gameState.cursorPoint) {
      const targetPos = gameState.cursorPoint.clone().normalize().multiplyScalar(SPHERE_RADIUS);
      avatarPos = moveTowards(avatarPos, targetPos, 0.015 * (state.player.speedModifier || 1));
      const conv = spherePosToUv(avatarPos);
      state.player.x = conv.u * canvas.width;
      state.player.y = conv.v * canvas.height;
    }
    // Update Nexus avatar mesh
    if (nexusAvatar) {
      nexusAvatar.object3D.position.copy(avatarPos);
      nexusAvatar.object3D.lookAt(new THREE.Vector3(0, 0, 0));
    }
    // Update enemies on sphere
    if (enemyContainer) {
      const existing = new Set();
      (state.enemies || []).forEach(e => {
        existing.add(e.instanceId);
        let el = enemyContainer.querySelector(`[data-eid="${e.instanceId}"]`);
        const pos = uvToSpherePos(e.x / canvas.width, e.y / canvas.height, SPHERE_RADIUS);
        if (!el) {
          el = document.createElement('a-box');
          el.setAttribute('depth', 0.4);
          el.setAttribute('height', 0.4);
          el.setAttribute('width', 0.4);
          el.setAttribute('color', e.color || '#ff4040');
          el.dataset.eid = e.instanceId;
          enemyContainer.appendChild(el);
        }
        el.object3D.position.copy(pos);
        el.object3D.lookAt(new THREE.Vector3(0,0,0));
      });
      enemyContainer.querySelectorAll('[data-eid]').forEach(el => {
        if (!existing.has(parseFloat(el.dataset.eid))) el.remove();
      });
    }
    // Update projectiles on sphere
    if (projectileContainer) {
      const active = new Set();
      (state.effects || []).forEach(effect => {
        const types = ['nova_bullet','ricochet_projectile','seeking_shrapnel','helix_bolt','player_fragment'];
        if (!types.includes(effect.type)) return;
        let el = projectileMap.get(effect);
        const pos = uvToSpherePos(effect.x / canvas.width, effect.y / canvas.height, SPHERE_RADIUS);
        if (!el) {
          el = document.createElement('a-sphere');
          el.setAttribute('radius', 0.05);
          el.setAttribute('segments-height', 6);
          el.setAttribute('segments-width', 6);
          el.setAttribute('color', effect.color || '#ffd400');
          projectileContainer.appendChild(el);
          projectileMap.set(effect, el);
        }
        el.object3D.position.copy(pos);
        active.add(effect);
      });
      // Remove projectiles no longer present
      projectileMap.forEach((el, obj) => {
        if (!active.has(obj)) {
          el.remove();
          projectileMap.delete(obj);
        }
      });
    }
    // Update pickups on sphere
    if (pickupContainer) {
      const active = new Set();
      (state.pickups || []).forEach(p => {
        let el = pickupMap.get(p);
        const pos = uvToSpherePos(p.x / canvas.width, p.y / canvas.height, SPHERE_RADIUS);
        if (!el) {
          el = document.createElement('a-sphere');
          const color = p.type === 'score' ? '#f1c40f' : (p.type === 'rune_of_fate' ? '#f1c40f' : '#2ecc71');
          el.setAttribute('radius', Math.max(0.05, p.r / 50));
          el.setAttribute('color', color);
          el.setAttribute('segments-height', 6);
          el.setAttribute('segments-width', 6);
          pickupContainer.appendChild(el);
          pickupMap.set(p, el);
        }
        el.object3D.position.copy(pos);
        el.object3D.lookAt(new THREE.Vector3(0,0,0));
        active.add(p);
      });
      pickupMap.forEach((el, obj) => {
        if (!active.has(obj)) {
          el.remove();
          pickupMap.delete(obj);
        }
      });
    }
    updateUI();
    requestAnimationFrame(animate);
  }
  animate();
});
