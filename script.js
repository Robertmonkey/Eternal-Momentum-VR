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
 *     where the player's avatar currently stands in the VR world.
 *   - Event handlers for grabbing and moving the avatar as well as
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
  import { applyAllTalentEffects } from './modules/ascension.js';
  import { populateAberrationCoreMenu } from './modules/ui.js';
  import { STAGE_CONFIG } from './modules/config.js';
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
    // The hidden 2D canvas has the id "gameCanvas" in index.html.  Grab it here
    // rather than the old "game2dCanvas" id to ensure the texture updates correctly.
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Kick off a basic game run so the original modules have state to work with.
    resetGame(false);
    applyAllTalentEffects();
    state.currentStage = 1;

    // Initialise our own meta state for VR‑specific elements.  The actual
    // game logic lives in the imported `state` object.  We only track
    // cooldowns for the VR core interaction and the current 3D avatar
    // position here.
    const gameState = {
      coreCooldown: 10,
      lastCoreUse: -Infinity,
      playerPos: { x: 0, z: -2 },
      platformRadius: 3.5
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
    const offPowerText = document.getElementById('offPowerText');
    const defPowerText = document.getElementById('defPowerText');
    const bossPanel = document.getElementById('bossPanel');
    const bossNameText = document.getElementById('bossNameText');
    const bossHpText = document.getElementById('bossHpText');
    const resetButton = document.getElementById('resetButton');
    const stageSelectToggle = document.getElementById('stageSelectToggle');
    const stageSelectPanel = document.getElementById('stageSelectPanel');
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
    const soundOptionsToggle = document.getElementById("soundOptionsToggle");
    const soundOptionsModal = document.getElementById("soundOptionsModal");
    const closeSoundOptionsBtn = document.getElementById("closeSoundOptionsBtn");
    const musicVolume = document.getElementById("musicVolume");
    const sfxVolume = document.getElementById("sfxVolume");
    const muteToggle = document.getElementById("muteToggle");
    const bossInfoModal = document.getElementById("bossInfoModal");
    const closeBossInfoModalBtn = document.getElementById("closeBossInfoModalBtn");
    const maxStage = STAGE_CONFIG.length;
    const audioEls = Array.from(document.querySelectorAll(".game-audio"));
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
      levelText.setAttribute('value', `Level: ${state.player.level}`);
      stageText.setAttribute('value', `Stage: ${state.currentStage}`);
      if (offPowerText && defPowerText) {
        const offKey = state.offensiveInventory[0];
        const defKey = state.defensiveInventory[0];
        offPowerText.setAttribute('value', offKey ? powers[offKey].emoji : '');
        defPowerText.setAttribute('value', defKey ? powers[defKey].emoji : '');
      }
      const now = performance.now();
      const elapsed = (now - gameState.lastCoreUse) / 1000;
      const remaining = gameState.coreCooldown - elapsed;
      if (remaining > 0) {
        cooldownText.setAttribute('value', `Core cooldown: ${remaining.toFixed(1)}s`);
      } else {
        cooldownText.setAttribute('value', 'Core cooldown: Ready');
      }

      if (bossPanel && bossNameText && bossHpText) {
        const boss = state.enemies.find(e => e.boss);
        if (boss) {
          bossPanel.setAttribute('visible', 'true');
          bossNameText.setAttribute('value', boss.name || 'Boss');
          bossHpText.setAttribute('value', `HP: ${Math.floor(boss.hp)} / ${boss.maxHP}`);
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
        ctx.lineTo(maxR * Math.cos(angle), maxR * Math.sin(angle));
        ctx.stroke();
      }
      // Draw player as a small circle
      const pos = gameState.playerPos;
      const theta = Math.atan2(-pos.z, pos.x) + Math.PI;
      const radial = Math.min(1, Math.hypot(pos.x, pos.z) / gameState.platformRadius);
      const px = (theta / (2 * Math.PI) - 0.5) * width;
      const py = (0.5 - radial) * height;
      ctx.fillStyle = '#00aaff';
      ctx.beginPath();
      ctx.arc(px, py, 15, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }

    // Set up interaction on the aberration core.  When the user clicks the
    // core sphere, a cooldown begins.  We call into the imported
    // `activateCorePower()` function which triggers the currently equipped
    // core’s active ability.  The original game expects mouse coordinates
    // but our VR environment does not use a cursor, so we pass 0,0.
    const coreModel = document.getElementById('coreModel');
    coreModel.addEventListener('click', () => {
      const now = performance.now();
      const elapsed = (now - gameState.lastCoreUse) / 1000;
      if (elapsed >= gameState.coreCooldown) {
        gameState.lastCoreUse = now;
        // Trigger the core’s active ability.  Passing dummy coordinates and
        // an empty gameHelpers object is sufficient for many cores to
        // perform their behaviour.  If additional helpers are required you
        // can import and pass them here.
        try {
          activateCorePower(0, 0, {});
        } catch (e) {
          console.warn('activateCorePower threw an error', e);
        }
      }
    });

    if (resetButton) {
      resetButton.addEventListener('click', () => {
        resetGame(false);
        applyAllTalentEffects();
        gameState.lastCoreUse = -Infinity;
        gameOverShown = false;
        statusText.setAttribute('value', '');
        updateUI();
      });
    }

    if (stageSelectToggle && stageSelectPanel) {
      stageSelectToggle.addEventListener('click', () => {
        if (stageSelectPanel.getAttribute('visible') === true || stageSelectPanel.getAttribute('visible') === 'true') {
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
        stageSelectPanel.setAttribute('visible', 'false');
        statusText.setAttribute('value', '');
        updateUI();
      });
    }

    function equipCore(coreId) {
      state.player.equippedAberrationCore = coreId;
      savePlayerState();
      applyAllTalentEffects();
      populateAberrationCoreMenu(equipCore);
      updateUI();
    }

    if (coreMenuToggle && aberrationCoreModal) {
      coreMenuToggle.addEventListener('click', () => {
        populateAberrationCoreMenu(equipCore);
        aberrationCoreModal.style.display = 'flex';
      });
    }
    if (closeAberrationCoreBtn) {
      closeAberrationCoreBtn.addEventListener('click', () => {
        aberrationCoreModal.style.display = 'none';
      });
    }
    if (unequipCoreBtn) {
      unequipCoreBtn.addEventListener('click', () => {
        equipCore(null);
        aberrationCoreModal.style.display = 'none';
      });
    }
      if (ascensionToggle && ascensionGridModal) {
        ascensionToggle.addEventListener("click", () => {
          apTotalAscGrid.innerText = state.player.ascensionPoints;
          renderAscensionGrid();
          ascensionGridModal.style.display = "flex";
        });
      }
      if (closeAscensionGridBtn) {
        closeAscensionGridBtn.addEventListener("click", () => {
          ascensionGridModal.style.display = "none";
        });
      }
      if (codexToggle && loreCodexModal) {
        codexToggle.addEventListener("click", () => {
          populateLoreCodex();
          loreCodexModal.style.display = "flex";
        });
      }
      if (closeLoreCodexBtn) {
        closeLoreCodexBtn.addEventListener("click", () => {
          loreCodexModal.style.display = "none";
        });
      }
      if (soundOptionsToggle && soundOptionsModal) {
        soundOptionsToggle.addEventListener("click", () => {
          musicVolume.value = AudioManager.musicVolume;
          sfxVolume.value = AudioManager.sfxVolume;
          muteToggle.innerText = AudioManager.userMuted ? "Unmute" : "Mute";
          soundOptionsModal.style.display = "flex";
        });
      }
      if (closeSoundOptionsBtn) {
        closeSoundOptionsBtn.addEventListener("click", () => {
          soundOptionsModal.style.display = "none";
        });
      }
      if (muteToggle) {
        muteToggle.addEventListener("click", () => {
          AudioManager.toggleMute();
          muteToggle.innerText = AudioManager.userMuted ? "Unmute" : "Mute";
        });
      }
      if (musicVolume) {
        musicVolume.addEventListener("input", e => AudioManager.setMusicVolume(parseFloat(e.target.value)));
      }
      if (sfxVolume) {
        sfxVolume.addEventListener("input", e => AudioManager.setSfxVolume(parseFloat(e.target.value)));
      }

    // Trigger equipped powers when the controller triggers are pressed.
    const leftHand = document.getElementById('leftHand');
    const rightHand = document.getElementById('rightHand');
    if (leftHand && rightHand) {
      leftHand.addEventListener('triggerdown', () => {
        const key = state.offensiveInventory[0];
        if (key) usePower(key);
      });
      rightHand.addEventListener('triggerdown', () => {
        const key = state.defensiveInventory[0];
        if (key) usePower(key);
      });
    }

    // Handle dragging of the player avatar.  On release update the stored
    // VR position and also update the underlying game state if the
    // original modules are present.  We convert the 3D avatar position
    // into 2D canvas coordinates and assign them to `state.player.x` and
    // `state.player.y`.  Feel free to adjust this mapping to better fit
    // the gameplay surface.
    const playerAvatar = document.getElementById('playerAvatar');
    playerAvatar.addEventListener('dragend', evt => {
      const pos3D = evt.detail.target.object3D.position;
      // Clamp to the platform radius so the avatar cannot be dragged off
      let x = pos3D.x;
      let z = pos3D.z;
      const dist = Math.hypot(x, z);
      if (dist > gameState.platformRadius - 0.25) {
        const scale = (gameState.platformRadius - 0.25) / dist;
        x *= scale;
        z *= scale;
        playerAvatar.object3D.position.set(x, pos3D.y, z);
      }
      gameState.playerPos.x = playerAvatar.object3D.position.x;
      gameState.playerPos.z = playerAvatar.object3D.position.z;
      // Convert to 2D game coordinates if the original state is present.
      const { width, height } = canvas;
      const pos = gameState.playerPos;
      const theta = Math.atan2(-pos.z, pos.x) + Math.PI;
      const radial = Math.min(1, Math.hypot(pos.x, pos.z) / gameState.platformRadius);
      const px = (theta / (2 * Math.PI)) * width;
      const py = (1 - radial) * height;
      if (state && state.player) {
        state.player.x = px;
        state.player.y = py;
      }
    });


    // Main animation loop.  It runs at the browser's animation rate (~60 Hz)
    // and updates the canvas and UI.  If the original game modules are
    // available we call `gameTick()` to advance the game and redraw the
    // canvas.  Otherwise we fall back to drawing a simple grid.
    function animate() {
      // Advance the game if possible
      if (typeof gameTick === 'function') {
        try {
          gameTick();
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
        gameOverShown = true;
      }

      // Update UI panels
      updateUI();
      requestAnimationFrame(animate);
    }
    animate();
  });
