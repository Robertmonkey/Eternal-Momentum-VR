/*
 * script.js – runtime logic for the Eternal Momentum VR prototype
 *
 * This file augments the A‑Frame scene defined in index.html with a few
 * behaviours:
 *   - A custom `canvas-texture` component copies the hidden 2D canvas
 *     (`#game2dCanvas`) onto the inside of the cylindrical arena each frame.
 *   - Simple game state management for score, health and core cooldown.
 *   - UI updates to keep the panels on the waist‑high table in sync with
 *     the game state.
 *   - Drawing routines for the 2D canvas that approximate the original
 *     Eternal Momentum gameplay surface.  A circle on the canvas shows
 *     the player's current position, mirrored in VR by a small draggable
 *     marker on the table.
 *   - Event handlers for grabbing and moving that marker as well as
 *     activating the aberration core.  These handlers update the game
 *     state and trigger UI changes accordingly.
 *
 * NOTE: This file is intentionally lightweight.  It demonstrates how to
 * integrate 2D canvas rendering into a VR scene and exposes hooks where
 * the full Eternal Momentum game logic can be connected.  Integrating
 * the complete JavaScript modules from the original project is beyond
 * the scope of this prototype, but you can import and call them from
 * here as needed.  See README.md for integration guidance.
 */

// The contents of this file run in an ES module context.  See index.html
// where the script is included with `type="module"`.  Imports of game
// modules appear at the top level.
  // Import the Eternal Momentum modules.  These imports will be resolved
  // relative to this file.  In this repository the original game source
  // already lives in the `modules/` directory at the project root, so no
  // extra copying is required.  The script is loaded as an ES module in
  // index.html so these imports resolve directly.
  // Import the core game modules.  The original source lives in the
  // `modules/` directory at the repository root, so we import from there
  // directly rather than using the old vr_port path.
  import { gameTick, spawnBossesForStage } from './modules/gameLoop.js';
  import { state, resetGame, savePlayerState } from './modules/state.js';
  import { activateCorePower } from './modules/cores.js';
  import { usePower, powers } from './modules/powers.js';
import { applyAllTalentEffects, renderAscensionGrid } from './modules/ascension.js';
import { populateAberrationCoreMenu, populateOrreryMenu, populateLoreCodex } from './modules/ui.js';
  import { STAGE_CONFIG } from './modules/config.js';
import { AudioManager } from "./modules/audio.js";
import { uvToSpherePos, spherePosToUv } from './modules/utils.js';
// Register a component that applies a 2D canvas as a live texture
  // on an entity.  When attached to the cylinder in index.html it
  // continuously copies the canvas contents into the material map.
  AFRAME.registerComponent('canvas-texture', {
    schema: { type: 'selector' },
    init: function () {
      const canvas = this.data;
      if (!canvas) {
        console.error('canvas-texture: target canvas not found');
        return;
      }
      // Create a Three.js texture from the canvas
      this.texture = new THREE.CanvasTexture(canvas);
      this.texture.minFilter = THREE.LinearFilter;
      this.texture.magFilter = THREE.LinearFilter;
      // Wait until the entity has a mesh to apply the material
      this.el.addEventListener('model-loaded', () => this.applyTexture());
      if (this.el.getObject3D('mesh')) this.applyTexture();
    },
    applyTexture: function () {
      const mesh = this.el.getObject3D('mesh');
      if (!mesh) return;
      const material = mesh.material;
      // When the material is an array (for multi‑material geometries), set the map on each
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
      if (this.texture) {
        this.texture.needsUpdate = true;
      }
    }
  });
// Once the DOM is fully loaded, set up the game state and event listeners
window.addEventListener('load', () => {
    // Create an offscreen canvas for legacy modules that still expect one.
    // This canvas is not added to the DOM so no 2D elements are visible.
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

    // Kick off a basic game run so the original modules have state to work with.
    resetGame(false);
    applyAllTalentEffects();
    state.currentStage = 1;
    // Initialise our own meta state for VR-specific elements.
    // The actual game logic lives in the imported `state` object.
    // We only track cooldowns for the core interaction and current cursor position.
    const gameState = {
      lastCoreUse: -Infinity,
      cursorUV: null,
      cursorPoint: null
    };

    // Track the previous health value to trigger haptics on damage
    let lastHealth = state.player.health;

    // Current 3D position of the player's avatar on the spherical arena
    let avatarPos = uvToSpherePos(0.5, 0.5, SPHERE_RADIUS);
    const startUv = spherePosToUv(avatarPos);
    state.player.x = startUv.u * canvas.width;
    state.player.y = startUv.v * canvas.height;

    const CORE_COOLDOWNS = {
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
    let lastStage = state.currentStage;
    let statusTimeout = null;
    let gameOverShown = false;

    // Cache references to UI elements for quick updates
    const scoreText = document.getElementById('scoreText');
    const healthText = document.getElementById('healthText');
    const levelText = document.getElementById('levelText');
    const stageText = document.getElementById('stageText');
    const cooldownText = document.getElementById('cooldownText');
    const statusText = document.getElementById('statusText');
    const statusEffectsText = document.getElementById('statusEffectsText');
    const apText = document.getElementById('apText');
    const offPowerText = document.getElementById('offPowerText');
    const offPowerQueueText = document.getElementById('offPowerQueueText');
    const defPowerText = document.getElementById('defPowerText');
    const defPowerQueueText = document.getElementById('defPowerQueueText');
    const bossPanel = document.getElementById('bossPanel');
    const bossNameText = document.getElementById('bossNameText');
    const bossHpText = document.getElementById('bossHpText');
    const resetButton = document.getElementById('resetButton');
    const stageSelectToggle = document.getElementById('stageSelectToggle');
    const stageSelectPanel = document.getElementById('stageSelectPanel');
    const pauseToggle = document.getElementById("pauseToggle");
    const pauseText = document.getElementById("pauseText");
    const stageSelectLabel = document.getElementById('stageSelectLabel');
    const prevStageBtn = document.getElementById('prevStageBtn');
    const nextStageBtn = document.getElementById('nextStageBtn');
    const startStageBtn = document.getElementById('startStageBtn');
    const coreMenuToggle = document.getElementById('coreMenuToggle');
    const aberrationCoreModal = document.getElementById('aberrationCoreModal');
    const closeAberrationCoreBtn = document.getElementById('closeAberrationCoreBtn');
    const unequipCoreBtn = document.getElementById('unequipCoreBtn');

    const ascensionToggle = document.getElementById("ascensionToggle");
    const ascensionGridModal = document.getElementById("ascensionGridModal");
    const closeAscensionGridBtn = document.getElementById("closeAscensionGridBtn");
    const apTotalAscGrid = document.getElementById("ap-total-asc-grid");
    const codexToggle = document.getElementById("codexToggle");
    const loreCodexModal = document.getElementById("loreCodexModal");
    const closeLoreCodexBtn = document.getElementById("closeLoreCodexBtn");
    const orreryToggle = document.getElementById("orreryToggle");
    const orreryModal = document.getElementById("orreryModal");
    const closeOrreryBtn = document.getElementById("closeOrreryBtn");
    const soundOptionsToggle = document.getElementById("soundOptionsToggle");
    const soundOptionsModal = document.getElementById("soundOptionsModal");
    const closeSoundOptionsBtn = document.getElementById("closeSoundOptionsBtn");
    const musicVolume = document.getElementById("musicVolume");
    const sfxVolume = document.getElementById("sfxVolume");
    const aberrationCorePanel = document.getElementById("aberrationCorePanel");
    const ascensionGridPanel = document.getElementById("ascensionGridPanel");
    const loreCodexPanel = document.getElementById("loreCodexPanel");
    const bossInfoPanel = document.getElementById("bossInfoPanel");
    const cursorMarker = document.getElementById("cursorMarker");
    const orreryPanel = document.getElementById("orreryPanel");
    const soundOptionsPanel = document.getElementById("soundOptionsPanel");
    const muteToggle = document.getElementById("muteToggle");
    const gameOverPanel = document.getElementById("gameOverPanel");
    const restartStageBtn = document.getElementById("restartStageBtn");
    const levelSelectMenuBtn = document.getElementById("levelSelectMenuBtn");
    const ascensionMenuBtn = document.getElementById("ascensionMenuBtn");
    const aberrationCoreMenuBtn = document.getElementById("aberrationCoreMenuBtn");
    const bossInfoModal = document.getElementById("bossInfoModal");
    const closeBossInfoModalBtn = document.getElementById("closeBossInfoModalBtn");    const homeScreen = document.getElementById('home-screen');
    const startVrBtn = document.getElementById('start-vr-btn');
    const coreCooldownRing = document.getElementById('coreCooldownRing');
    const maxStage = STAGE_CONFIG.length;
    const audioEls = Array.from(document.querySelectorAll(".game-audio"));
    // Main battlefield surface the player interacts with
    const battleSphere = document.getElementById("battleSphere");
    const screenCursor = document.getElementById("screenCursor");
    const nexusAvatar = document.getElementById("nexusAvatar");
    const enemyContainer = document.getElementById("enemyContainer");
    const projectileContainer = document.getElementById("projectileContainer");
    const projectileEls = new Map();
    const leftHand = document.getElementById("leftHand");
    const rightHand = document.getElementById("rightHand");
    const vignetteRing = document.getElementById("vignette");
    function triggerHaptic(el, intensity = 0.5, duration = 50) {
      const controller = el?.components["laser-controls"]?.controller ||
                        el?.components["tracked-controls"]?.controller;
      const actuator = controller?.hapticActuators?.[0];
      if (actuator && actuator.pulse) {
        try { actuator.pulse(intensity, duration); } catch (e) {}
      } else if (navigator.vibrate) {
        navigator.vibrate(duration);
      }
    }

    function pulseBoth(intensity = 0.5, duration = 50) {
      if (leftHand) triggerHaptic(leftHand, intensity, duration);
      if (rightHand) triggerHaptic(rightHand, intensity, duration);
    }
    AudioManager.setup(audioEls, muteToggle);
    document.addEventListener("visibilitychange", () => AudioManager.handleVisibilityChange());
    let selectedStage = state.currentStage;

    function updateStageSelectDisplay() {
      if (stageSelectLabel) {
        stageSelectLabel.setAttribute('value', `Stage: ${selectedStage}`);
      }
    }

    // Helper to update the scoreboard and health bars.  Values are read
    // directly from the imported game state.  You can customise which
    // attributes to display (e.g. essence, level) here.
    function updateUI() {
      // The original game does not have a single “score” field.  We use
      // essence as a proxy so the user can see progress.  Adjust as desired.
      const essence = state.player.essence ?? 0;
      scoreText.setAttribute('value', `Essence: ${Math.floor(essence)}`);
      const health = state.player.health ?? 0;
      healthText.setAttribute('value', `Health: ${Math.floor(health)}`);
      if (vignetteRing && state.player.maxHealth) {
        const ratio = Math.max(0, Math.min(1, health / state.player.maxHealth));
        const opacity = Math.min(0.6, (1 - ratio) * (1 - ratio) * 0.8);
        vignetteRing.setAttribute('visible', opacity > 0.01);
        vignetteRing.setAttribute('material', 'opacity', opacity);
      }
      levelText.setAttribute('value', `Level: ${state.player.level}`);
      stageText.setAttribute('value', `Stage: ${state.currentStage}`);
      if (apText) {
        apText.setAttribute('value', `AP: ${state.player.ascensionPoints}`);
      }
      if (offPowerText && defPowerText) {
        const offKey = state.offensiveInventory[0];
        const defKey = state.defensiveInventory[0];
        offPowerText.setAttribute('value', offKey ? powers[offKey].emoji : '');
        defPowerText.setAttribute('value', defKey ? powers[defKey].emoji : '');
      }
      if (offPowerQueueText && defPowerQueueText) {
        const offNext = state.offensiveInventory.slice(1).filter(Boolean).map(k => powers[k].emoji).join(' ');
        const defNext = state.defensiveInventory.slice(1).filter(Boolean).map(k => powers[k].emoji).join(' ');
        offPowerQueueText.setAttribute('value', offNext);
        defPowerQueueText.setAttribute('value', defNext);
      }
      const nowMs = Date.now();
      const coreId = state.player.equippedAberrationCore;
      let remainingMs = 0;
      let durationMs = 0;
      if (coreId) {
        const coreState = state.player.talent_states.core_states[coreId];
        durationMs = CORE_COOLDOWNS[coreId] || 0;
        if (coreState && coreState.cooldownUntil) {
          remainingMs = coreState.cooldownUntil - nowMs;
          if (remainingMs < 0) remainingMs = 0;
        }
      }
      if (remainingMs > 0) {
        cooldownText.setAttribute('value', `Core cooldown: ${(remainingMs / 1000).toFixed(1)}s`);
      } else {
        cooldownText.setAttribute('value', 'Core cooldown: Ready');
      }
      if (coreCooldownRing) {
        if (durationMs > 0 && remainingMs > 0) {
          const progress = 1 - remainingMs / durationMs;
          coreCooldownRing.setAttribute('theta-length', progress * 360);
          coreCooldownRing.setAttribute('visible', 'true');
        } else {
          coreCooldownRing.setAttribute('visible', 'false');
          coreCooldownRing.setAttribute('theta-length', 0);
        }
      }

      if (bossPanel && bossNameText && bossHpText) {
        const bosses = state.enemies.filter(e => e.boss);
        if (bosses.length > 0) {
          bossPanel.setAttribute('visible', 'true');
          const names = bosses.map(b => b.name || 'Boss').join('\n');
          const hpLines = bosses.map(b => `HP: ${Math.floor(b.hp)} / ${b.maxHP}`).join('\n');
          bossNameText.setAttribute('value', names);
          bossHpText.setAttribute('value', hpLines);
        } else {
          bossPanel.setAttribute('visible', 'false');
        }
      }

      if (statusEffectsText) {
        const emojis = state.player.statusEffects.map(e => e.emoji).join(' ');
        statusEffectsText.setAttribute('value', emojis);
      }
    }

    // Draw the 2D playfield.  Once the original game is integrated you
    // should not call this function; instead call `gameTick()` below which
    // will update the canvas based on the game state.  This function
    // remains as a fallback illustration for cases where the game files
    // have not been copied.
    function drawGameCanvasFallback() {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      // Draw dark background
      // Match the dark background from the original Eternal Momentum UI
      ctx.fillStyle = '#1e1e2f';
      ctx.fillRect(0, 0, width, height);
      ctx.save();
      // Draw radial grid to hint at orientation
      ctx.translate(width / 2, height / 2);
      const maxR = Math.min(width, height) / 2;
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      for (let r = maxR; r > 0; r -= maxR / 5) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
        ctx.stroke();
      }
      // Radial lines
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * maxR, Math.sin(angle) * maxR);
        ctx.stroke();
      }

      ctx.restore();

      const px = state.player.x ?? width / 2;
      const py = state.player.y ?? height / 2;
      ctx.fillStyle = "#00aaff";
      ctx.beginPath();
      ctx.arc(px, py, 15, 0, 2 * Math.PI);
      ctx.fill();
    }
    // Set up interaction on the aberration core.  When the user clicks the
    // core sphere, a cooldown begins.  We call into the imported
    // `activateCorePower()` function which triggers the currently equipped
    // core’s active ability.  The original game expects mouse coordinates
    // but our VR environment does not use a cursor, so we pass 0,0.
    const coreModel = document.getElementById('coreModel');
    coreModel.addEventListener('click', () => {
      const coreId = state.player.equippedAberrationCore;
      let remaining = 0;
      if (coreId) {
        const cs = state.player.talent_states.core_states[coreId];
        if (cs && cs.cooldownUntil) remaining = cs.cooldownUntil - Date.now();
      }
      if (remaining <= 0) {
        gameState.lastCoreUse = Date.now();
        // Trigger the core’s active ability.  Passing dummy coordinates and
        // an empty gameHelpers object is sufficient for many cores to
        // perform their behaviour.  If additional helpers are required you
        // can import and pass them here.
        try {
          activateCorePower(0, 0, {});
        } catch (e) {
          console.warn('activateCorePower threw an error', e);
        }
        pulseBoth(0.7, 100);
      }
    });

    if (resetButton) {
      resetButton.addEventListener('click', () => {
        resetGame(false);
        applyAllTalentEffects();
        gameState.lastCoreUse = -Infinity;
        gameOverShown = false;
        avatarPos = uvToSpherePos(0.5, 0.5, SPHERE_RADIUS);
        const uv0 = spherePosToUv(avatarPos);
        state.player.x = uv0.u * canvas.width;
        state.player.y = uv0.v * canvas.height;
        statusText.setAttribute('value', '');
        updateUI();
      });
    }
    if (pauseToggle) {
      pauseToggle.addEventListener("click", () => {
        state.isPaused = !state.isPaused;
        if (state.isPaused) {
          if (pauseText) pauseText.setAttribute("value", "Resume");
          statusText.setAttribute("value", "PAUSED");
          AudioManager.fadeOutMusic(500);
        } else {
          if (pauseText) pauseText.setAttribute("value", "Pause");
          statusText.setAttribute("value", "");
          AudioManager.playMusic();
        }
      });
    }

    if (stageSelectToggle && stageSelectPanel) {
      stageSelectToggle.addEventListener('click', () => {
        if (stageSelectPanel.getAttribute('visible') === 'true') {
          stageSelectPanel.setAttribute('visible', 'false');
        } else {
          selectedStage = state.currentStage;
          updateStageSelectDisplay();
          stageSelectPanel.setAttribute('visible', 'true');
        }
      });
    }
    if (prevStageBtn) {
      prevStageBtn.addEventListener('click', () => {
        selectedStage = Math.max(1, selectedStage - 1);
        updateStageSelectDisplay();
      });
    }
    if (nextStageBtn) {
      nextStageBtn.addEventListener('click', () => {
        selectedStage = Math.min(maxStage, selectedStage + 1);
        updateStageSelectDisplay();
      });
    }
    if (startStageBtn) {
      startStageBtn.addEventListener('click', () => {
        state.currentStage = selectedStage;
        resetGame(false);
        applyAllTalentEffects();
        gameState.lastCoreUse = -Infinity;
        gameOverShown = false;
        avatarPos = uvToSpherePos(0.5, 0.5, SPHERE_RADIUS);
        const uv0 = spherePosToUv(avatarPos);
        state.player.x = uv0.u * canvas.width;
        state.player.y = uv0.v * canvas.height;
        stageSelectPanel.setAttribute('visible', 'false');
        statusText.setAttribute('value', '');
        updateUI();
      });
    }

    function restartCurrentStage() {
      resetGame(false);
      applyAllTalentEffects();
      gameState.lastCoreUse = -Infinity;
      gameOverShown = false;
      if (gameOverPanel) gameOverPanel.setAttribute('visible', 'false');
      statusText.setAttribute('value', '');
      avatarPos = uvToSpherePos(0.5, 0.5, SPHERE_RADIUS);
      const uv0 = spherePosToUv(avatarPos);
      state.player.x = uv0.u * canvas.width;
      state.player.y = uv0.v * canvas.height;
      updateUI();
    }

    if (restartStageBtn) {
      restartStageBtn.addEventListener('click', () => {
        restartCurrentStage();
      });
    }

    if (levelSelectMenuBtn && stageSelectToggle) {
      levelSelectMenuBtn.addEventListener('click', () => {
        if (gameOverPanel) gameOverPanel.setAttribute('visible', 'false');
        stageSelectToggle.emit('click');
      });
    }

    if (ascensionMenuBtn && ascensionToggle) {
      ascensionMenuBtn.addEventListener('click', () => {
        if (gameOverPanel) gameOverPanel.setAttribute('visible', 'false');
        ascensionToggle.emit('click');
      });
    }

    if (aberrationCoreMenuBtn && coreMenuToggle) {
      aberrationCoreMenuBtn.addEventListener('click', () => {
        if (gameOverPanel) gameOverPanel.setAttribute('visible', 'false');
        coreMenuToggle.emit('click');
      });
    }

    if (startVrBtn && homeScreen) {
      startVrBtn.addEventListener('click', () => {
        AudioManager.unlockAudio();
        homeScreen.style.display = 'none';
      });
    }

    function startOrreryEncounter(bossList) {
      resetGame(true);
      state.customOrreryBosses = bossList;
      state.currentStage = 999;
      gameState.lastCoreUse = -Infinity;
      gameOverShown = false;
      avatarPos = uvToSpherePos(0.5, 0.5, SPHERE_RADIUS);
      const uv0 = spherePosToUv(avatarPos);
      state.player.x = uv0.u * canvas.width;
      state.player.y = uv0.v * canvas.height;
      orreryModal.style.display = 'none';
      statusText.setAttribute('value', '');
      updateUI();
    }

    function equipCore(coreId) {
      state.player.equippedAberrationCore = coreId;
      savePlayerState();
      applyAllTalentEffects();
      populateAberrationCoreMenu(equipCore);
      updateUI();
    }

    if (coreMenuToggle && aberrationCorePanel) {
      coreMenuToggle.addEventListener('click', () => {
        populateAberrationCoreMenu(equipCore);
        aberrationCorePanel.setAttribute('visible', 'true');
      });
    }
    if (closeAberrationCoreBtn) {
      closeAberrationCoreBtn.addEventListener('click', () => {
        aberrationCorePanel.setAttribute('visible', 'false');
      });
    }
    if (unequipCoreBtn) {
      unequipCoreBtn.addEventListener('click', () => {
        equipCore(null);
        aberrationCorePanel.setAttribute('visible', 'false');
      });
    }
    if (ascensionToggle && ascensionGridPanel) {
      ascensionToggle.addEventListener('click', () => {
        apTotalAscGrid.innerText = state.player.ascensionPoints;
        renderAscensionGrid();
        ascensionGridPanel.setAttribute('visible', 'true');
      });
    }
    if (closeAscensionGridBtn) {
      closeAscensionGridBtn.addEventListener('click', () => {
        ascensionGridPanel.setAttribute('visible', 'false');
      });
    }
    if (codexToggle && loreCodexPanel) {
      codexToggle.addEventListener('click', () => {
        populateLoreCodex();
        loreCodexPanel.setAttribute('visible', 'true');
      });
    }
    if (closeLoreCodexBtn) {
      closeLoreCodexBtn.addEventListener('click', () => {
        loreCodexPanel.setAttribute('visible', 'false');
      });
    }
    if (orreryToggle && orreryPanel) {
      orreryToggle.addEventListener('click', () => {
        populateOrreryMenu(startOrreryEncounter);
        orreryPanel.setAttribute('visible', 'true');
      });
    }
    if (closeOrreryBtn) {
      closeOrreryBtn.addEventListener('click', () => {
        orreryPanel.setAttribute('visible', 'false');
      });
    }
    if (soundOptionsToggle && soundOptionsPanel) {
      soundOptionsToggle.addEventListener('click', () => {
        musicVolume.value = AudioManager.musicVolume;
        sfxVolume.value = AudioManager.sfxVolume;
        muteToggle.innerText = AudioManager.userMuted ? 'Unmute' : 'Mute';
        soundOptionsPanel.setAttribute('visible', 'true');
      });
    }
    if (closeSoundOptionsBtn) {
      closeSoundOptionsBtn.addEventListener('click', () => {
        soundOptionsPanel.setAttribute('visible', 'false');
      });
    }
    if (muteToggle) {
      muteToggle.addEventListener('click', () => {
        AudioManager.toggleMute();
        muteToggle.innerText = AudioManager.userMuted ? 'Unmute' : 'Mute';
      });
    }
    if (musicVolume) {
      musicVolume.addEventListener('input', e => AudioManager.setMusicVolume(parseFloat(e.target.value)));
    }
    if (sfxVolume) {
      sfxVolume.addEventListener('input', e => AudioManager.setSfxVolume(parseFloat(e.target.value)));
    }
    if (battleSphere) {
      battleSphere.addEventListener("raycaster-intersection", e => {
        const hit = e.detail.intersections[0];
        if (hit && hit.uv) {
          gameState.cursorUV = hit.uv;
          gameState.cursorPoint = hit.point.clone();
          if (screenCursor) {
            screenCursor.object3D.position.copy(hit.point);
            screenCursor.object3D.lookAt(camera.object3D.position);
            screenCursor.setAttribute('visible', 'true');
          }
        }
      });
      battleSphere.addEventListener("raycaster-intersection-cleared", e => {
        if (e.detail.clearedEl === battleSphere) {
          gameState.cursorUV = null;
          gameState.cursorPoint = null;
          if (screenCursor) screenCursor.setAttribute('visible', 'false');
        }
      });
      battleSphere.addEventListener("click", e => {
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
    if (leftHand && rightHand) {
      let leftTriggerDown = false;
      let rightTriggerDown = false;
      let coreTriggerTimeout = null;

      function tryActivateCore() {
        if (!leftTriggerDown || !rightTriggerDown || coreTriggerTimeout) return;
        const coreId = state.player.equippedAberrationCore;
        let remaining = 0;
        if (coreId) {
          const cs = state.player.talent_states.core_states[coreId];
          if (cs && cs.cooldownUntil) remaining = cs.cooldownUntil - Date.now();
        }
        if (remaining <= 0) {
          gameState.lastCoreUse = Date.now();
          try {
            activateCorePower(0, 0, {});
          } catch (e) {
            console.warn('activateCorePower threw an error', e);
          }
          pulseBoth(0.7, 100);
        }
        coreTriggerTimeout = setTimeout(() => { coreTriggerTimeout = null; }, 100);
      }

      leftHand.addEventListener('triggerdown', () => {
        leftTriggerDown = true;
        if (rightTriggerDown) {
          tryActivateCore();
        } else {
          const key = state.offensiveInventory[0];
          if (key) usePower(key);
        }
        pulseBoth(0.4, 50);
      });
      leftHand.addEventListener('triggerup', () => { leftTriggerDown = false; });
      rightHand.addEventListener('triggerdown', () => {
        rightTriggerDown = true;
        if (leftTriggerDown) {
          tryActivateCore();
        } else {
          const key = state.defensiveInventory[0];
          if (key) usePower(key);
        }
        pulseBoth(0.4, 50);
      });
      rightHand.addEventListener('triggerup', () => { rightTriggerDown = false; });
      // Cycle powers with the grip buttons
      leftHand.addEventListener('gripdown', () => {
        if (state.offensiveInventory.filter(Boolean).length > 1) {
          state.offensiveInventory.push(state.offensiveInventory.shift());
          AudioManager.playSfx('uiHoverSound');
          updateUI();
        }
      });
      rightHand.addEventListener('gripdown', () => {
        if (state.defensiveInventory.filter(Boolean).length > 1) {
          state.defensiveInventory.push(state.defensiveInventory.shift());
          AudioManager.playSfx('uiHoverSound');
          updateUI();
        }
      });

      // --- NEW: Quick menu shortcuts using the controller face buttons ---
      // Right hand: "A" toggles stage select, "B" pauses the game.
      rightHand.addEventListener('abuttondown', () => {
        if (stageSelectToggle) stageSelectToggle.emit('click');
      });
      rightHand.addEventListener('bbuttondown', () => {
        if (pauseToggle) pauseToggle.emit('click');
      });
      // Left hand: "X" opens the core menu, "Y" opens the ascension grid.
      leftHand.addEventListener('xbuttondown', () => {
        if (coreMenuToggle) coreMenuToggle.emit('click');
      });
      leftHand.addEventListener('ybuttondown', () => {
        if (ascensionToggle) ascensionToggle.emit('click');
      });

      // Thumbstick presses for additional menus
      leftHand.addEventListener('thumbstickdown', () => {
        if (codexToggle) codexToggle.emit('click');
      });
      rightHand.addEventListener('thumbstickdown', () => {
        if (orreryToggle) orreryToggle.emit('click');
      });
    }

    // Draggable cursor marker to reposition the player on the command deck
    const PLATFORM_RADIUS = 3;
    const SPHERE_RADIUS = 8;

    // Helper functions convert between UV coordinates and 3D positions on the
    // spherical battlefield.  Implementations live in modules/utils.js.
    if (cursorMarker) {
      const updateFromMarker = pos => {
        let x = pos.x;
        let z = pos.z;
        const dist = Math.hypot(x, z);
        if (dist > PLATFORM_RADIUS) {
          const scale = PLATFORM_RADIUS / dist;
          x *= scale;
          z *= scale;
        }
        cursorMarker.object3D.position.set(x, cursorMarker.object3D.position.y, z);
        const { width, height } = canvas;
        const theta = Math.atan2(-z, x) + Math.PI;
        const radial = Math.min(1, Math.hypot(x, z) / PLATFORM_RADIUS);
        state.player.x = (theta / (2 * Math.PI)) * width;
        state.player.y = radial * height;
        avatarPos = uvToSpherePos(state.player.x / width, state.player.y / height, SPHERE_RADIUS);
      };

      cursorMarker.addEventListener('dragmove', e => {
        updateFromMarker(e.detail.position);
      });
    }


    // Main animation loop.  It runs at the browser's animation rate (~60 Hz)
    // and updates the canvas and UI.  If the original game modules are
    // available we call `gameTick()` to advance the game and redraw the
    // canvas.  Otherwise we fall back to drawing a simple grid.
    function animate() {
      // Advance the game if possible
      if (gameState.cursorPoint) {
        const target = gameState.cursorPoint.clone().normalize().multiplyScalar(SPHERE_RADIUS);
        const direction = target.clone().sub(avatarPos);
        const dist = direction.length();
        if (dist > 0.0001) {
          direction.normalize();
          const speedMod = state.player.speed || 1;
          const velocity = direction.multiplyScalar(dist * 0.015 * speedMod);
          avatarPos.add(velocity);
          avatarPos.normalize().multiplyScalar(SPHERE_RADIUS);
          const uv = spherePosToUv(avatarPos);
          state.player.x = uv.u * canvas.width;
          state.player.y = uv.v * canvas.height;
        }
      }
      if (typeof gameTick === 'function') {
        try {
          // Pass the player's current coordinates as both the cursor
          // and player position so the game logic remains stable.
          gameTick(state.player.x, state.player.y);
        } catch (e) {
          console.warn('gameTick threw an error', e);
          drawGameCanvasFallback();
        }
      } else {
        drawGameCanvasFallback();
      }

      if (state.currentStage !== lastStage) {
        lastStage = state.currentStage;
        if (statusTimeout) clearTimeout(statusTimeout);
        statusText.setAttribute('value', `Stage ${state.currentStage}`);
        statusTimeout = setTimeout(() => statusText.setAttribute('value', ''), 3000);
      }
      if (state.gameOver && !gameOverShown) {
        if (statusTimeout) clearTimeout(statusTimeout);
        statusText.setAttribute('value', 'GAME OVER');
        if (gameOverPanel) gameOverPanel.setAttribute('visible', 'true');
        gameOverShown = true;
      } else if (!state.gameOver && gameOverShown) {
        if (gameOverPanel) gameOverPanel.setAttribute('visible', 'false');
        gameOverShown = false;
      }

      // Update UI panels
      updateUI();
      // Trigger haptic feedback when the player's health changes
      const hp = state.player.health;
      if (hp < lastHealth) {
        pulseBoth(0.8, 100);
      } else if (hp > lastHealth) {
        pulseBoth(0.4, 60);
      }
      lastHealth = hp;
      if (cursorMarker) {
        const uv = spherePosToUv(avatarPos);
        const theta = uv.u * 2 * Math.PI;
        const r = PLATFORM_RADIUS * uv.v;
        cursorMarker.object3D.position.set(
          r * Math.cos(theta),
          cursorMarker.object3D.position.y,
          r * Math.sin(theta)
        );
      }

      // Update 3D arena objects on spherical surface
      if (nexusAvatar) {
        nexusAvatar.object3D.position.copy(avatarPos);
        nexusAvatar.object3D.lookAt(0, 0, 0);
      }
      if (enemyContainer) {
        const existing = new Set();
        state.enemies.forEach(e => {
          const id = e.instanceId;
          existing.add(id);
          let el = enemyContainer.querySelector(`[data-eid="${id}"]`);
          if (!el) {
            el = document.createElement('a-box');
            el.setAttribute('depth', 0.4);
            el.setAttribute('height', 0.4);
            el.setAttribute('width', 0.4);
            el.setAttribute('color', '#ff4040');
            el.dataset.eid = id;
            enemyContainer.appendChild(el);
          }
          const pos = uvToSpherePos(e.x / canvas.width, e.y / canvas.height, SPHERE_RADIUS);
          el.object3D.position.copy(pos);
          el.object3D.lookAt(0, 0, 0);
        });
        enemyContainer.querySelectorAll('[data-eid]').forEach(el => {
          if (!existing.has(parseFloat(el.dataset.eid))) {
            el.remove();
          }
        });
      }

      if (projectileContainer) {
        const active = new Set();
        const projTypes = ['nova_bullet','ricochet_projectile','seeking_shrapnel','helix_bolt','player_fragment'];
        state.effects.forEach(effect => {
          if (!projTypes.includes(effect.type)) return;
          let el = projectileEls.get(effect);
          active.add(effect);
          if (!el) {
            el = document.createElement('a-sphere');
            el.setAttribute('radius', 0.05);
            el.setAttribute('segments-height', 6);
            el.setAttribute('segments-width', 6);
            el.setAttribute('color', effect.color || '#ffd400');
            projectileContainer.appendChild(el);
            projectileEls.set(effect, el);
          } else if (effect.color) {
            el.setAttribute('color', effect.color);
          }
          const pos = uvToSpherePos(effect.x / canvas.width, effect.y / canvas.height, SPHERE_RADIUS);
          el.object3D.position.copy(pos);
        });
        projectileEls.forEach((el, eff) => {
          if (!active.has(eff)) {
            el.remove();
            projectileEls.delete(eff);
          }
        });
      }
      requestAnimationFrame(animate);
    }
    animate();
  });
