/*
 * script.js – VR runtime for Eternal Momentum
 *
 * This refactored version addresses critical bugs from the prototype. It
 * programmatically generates a VR-native command cluster UI, ensures all
 * gameplay entities spawn correctly on a spherical battlefield, and
 * implements a reliable stage-start sequence.
 */

import { gameTick, spawnBossesForStage } from './modules/gameLoop.js';
import { state, resetGame, savePlayerState, loadPlayerState } from './modules/state.js';
import { activateCorePower } from './modules/cores.js';
import { powers, usePower } from './modules/powers.js';
import { applyAllTalentEffects, renderAscensionGrid } from './modules/ascension.js';
import { populateAberrationCoreMenu, populateOrreryMenu, showBossInfo } from './modules/ui.js';
import { uvToSpherePos, spherePosToUv } from './modules/utils.js';
import { moveTowards } from './modules/movement3d.js';
import { AudioManager } from './modules/audio.js';
import { STAGE_CONFIG } from './modules/config.js';

// Register a component that applies a 2D canvas as a live texture on a mesh.
AFRAME.registerComponent('canvas-texture', {
  schema: { type: 'selector' },
  init: function () {
    const canvas = this.data;
    if (!canvas) return;
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.el.addEventListener('model-loaded', () => this.applyTexture());
    if (this.el.getObject3D('mesh')) this.applyTexture();
  },
  applyTexture: function () {
    const mesh = this.el.getObject3D('mesh');
    if (!mesh) return;
    const apply = (mat) => {
        mat.map = this.texture;
        mat.needsUpdate = true;
    };
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(apply);
    } else {
      apply(mesh.material);
    }
  },
  tick: function () {
    if (this.texture) this.texture.needsUpdate = true;
  }
});

window.addEventListener('load', () => {
  // --- Offscreen Canvas & Legacy Game Setup ---
  let canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    document.body.appendChild(canvas).style.display = 'none';
  }
  canvas.width = 2048;
  canvas.height = 1024;
  
  // --- VR Scene Element Caching ---
  const sceneEl = document.querySelector('a-scene');
  const commandDeck = document.getElementById('commandDeck');
  const cameraEl = document.getElementById('camera');
  const battleSphere = document.getElementById('battleSphere');
  const nexusAvatar = document.getElementById('nexusAvatar');
  const enemyContainer = document.getElementById('enemyContainer');
  const pickupContainer = document.getElementById('pickupContainer');
  const effectContainer = document.getElementById('effectContainer');
  const holographicPanel = document.getElementById('holographicPanel');
  const closeHolographicPanelBtn = document.getElementById('closeHolographicPanelBtn');
  const leftHand = document.getElementById('leftHand');
  const rightHand = document.getElementById('rightHand');
  const vignette = document.getElementById('vignette');

  const SPHERE_RADIUS = 8;
  const entityMap = new Map(); // Maps game state objects to A-Frame entities
  
  // --- Global Game State Management ---
  const vrState = {
    cursorPoint: new THREE.Vector3(),
    avatarPos: new THREE.Vector3(),
    isGameRunning: false,
    lastCoreUse: -Infinity,
    holographicPanelVisible: false
  };

  /**
   * Draws a neon grid onto a canvas element.
   * @param {HTMLCanvasElement} canvasEl The canvas to draw on.
   */
  function drawGrid(canvasEl) {
    const gctx = canvasEl.getContext('2d');
    const size = canvasEl.width;
    gctx.fillStyle = '#050510';
    gctx.fillRect(0, 0, size, size);
    gctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    gctx.lineWidth = 4;
    const step = size / 10;
    for (let i = 0; i <= 10; i++) {
        gctx.beginPath(); gctx.moveTo(i * step, 0); gctx.lineTo(i * step, size); gctx.stroke();
        gctx.beginPath(); gctx.moveTo(0, i * step); gctx.lineTo(size, i * step); gctx.stroke();
    }
  }

  /**
   * Creates the entire command cluster UI programmatically.
   */
  function createCommandCluster() {
    if (commandDeck.children.length > 0) return; // Already created

    const deckFloor = document.createElement('a-circle');
    deckFloor.id = 'deckFloor';
    deckFloor.setAttribute('radius', 2);
    deckFloor.setAttribute('rotation', '-90 0 0');
    deckFloor.setAttribute('material', 'transparent:true; opacity:0.6; side:double');
    deckFloor.setAttribute('canvas-texture', '#gridCanvas');
    commandDeck.appendChild(deckFloor);

    const panels = {
        'statusPanel': { angle: 0, r: 1.5, y: 0.1, width: 1.5, height: 0.6 },
        'bossHealthPanel': { angle: 0, r: 1.6, y: 0.55, width: 2, height: 0.2, visible: false }
    };

    for (const [id, config] of Object.entries(panels)) {
        const panel = document.createElement('a-plane');
        panel.id = id;
        panel.setAttribute('width', config.width);
        panel.setAttribute('height', config.height);
        panel.setAttribute('material', 'color: #141428; opacity: 0.9; transparent:true; emissive: #00ffff; emissiveIntensity: 0.2');
        panel.setAttribute('visible', config.visible !== false);
        const rad = THREE.MathUtils.degToRad(config.angle);
        panel.object3D.position.set(Math.sin(rad) * config.r, config.y, -Math.cos(rad) * config.r);
        panel.object3D.lookAt(new THREE.Vector3(0, config.y, 0));
        
        if (id === 'statusPanel') {
            panel.innerHTML = `
                <a-text id="healthText" value="Health: 100/100" position="0 0.18 0.01" align="center" width="1.4" color="#eaf2ff"></a-text>
                <a-text id="levelText" value="Level: 1" position="-0.45 0 0.01" align="left" width="1.4" color="#eaf2ff"></a-text>
                <a-text id="stageText" value="Stage: 1" position="0.45 0 0.01" align="right" width="1.4" color="#eaf2ff"></a-text>
                <a-text id="apText" value="AP: 0" position="-0.45 -0.18 0.01" align="left" width="1.4" color="#eaf2ff"></a-text>
                <a-text id="essenceText" value="Essence: 0" position="0.45 -0.18 0.01" align="right" width="1.4" color="#eaf2ff"></a-text>
            `;
        } else if (id === 'bossHealthPanel') {
            panel.innerHTML = `
                <a-text id="bossNameText" value="BOSS NAME" position="0 0.05 0.01" align="center" width="1.8" color="#eaf2ff"></a-text>
                <a-plane id="bossHpBarFill" width="1.8" height="0.05" position="0 -0.05 0.01" material="color:#e74c3c; side: double"></a-plane>
            `;
        }
        commandDeck.appendChild(panel);
    }

    const buttons = {
        'ascensionToggle': { emoji: '💠', angle: -60, r: 1.8, y: -0.2, modal: '#ascensionGridModal', canvas: '#ascensionGridCanvas', action: renderAscensionGrid },
        'coreMenuToggle': { emoji: '◎', angle: -30, r: 1.9, y: -0.2, modal: '#aberrationCoreModal', canvas: '#aberrationCoreCanvas', action: () => populateAberrationCoreMenu(coreId => {
            state.player.equippedAberrationCore = state.player.equippedAberrationCore === coreId ? null : coreId;
            savePlayerState();
            applyAllTalentEffects();
            populateAberrationCoreMenu(() => {});
        })},
        'orreryToggle': { emoji: '🌀', angle: 30, r: 1.9, y: -0.2, modal: '#orreryModal', canvas: '#orreryCanvas', action: () => populateOrreryMenu(bosses => {
            holographicPanel.setAttribute('visible', 'false');
            vrState.holographicPanelVisible = false;
            startOrreryEncounter(bosses);
        })},
        'soundOptionsToggle': { emoji: '🔊', angle: 60, r: 1.8, y: -0.2, action: () => AudioManager.toggleMute() }
    };

    for (const [id, config] of Object.entries(buttons)) {
        const button = document.createElement('a-entity');
        button.id = id;
        button.setAttribute('mixin', 'console-button');
        button.classList.add('interactive');
        const rad = THREE.MathUtils.degToRad(config.angle);
        button.object3D.position.set(Math.sin(rad) * config.r, config.y, -Math.cos(rad) * config.r);
        button.object3D.lookAt(new THREE.Vector3(0, config.y, 0));
        button.innerHTML = `<a-text value="${config.emoji}" align="center" width="1" color="#eaf2ff" position="0 0.01 0.06"></a-text>`;
        
        button.addEventListener('mouseenter', () => AudioManager.playSfx('uiHoverSound'));
        button.addEventListener('click', async () => {
            AudioManager.playSfx('uiClickSound');
            if (config.action) config.action();
            if (config.modal) {
                await showHolographicPanel(config.modal, config.canvas);
            }
        });
        commandDeck.appendChild(button);
    }
  }

  async function showHolographicPanel(modalSelector, canvasSelector) {
    const modalEl = document.querySelector(modalSelector);
    if (!modalEl || vrState.holographicPanelVisible) return;

    let targetCanvas = document.querySelector(canvasSelector);
    if (!targetCanvas) {
        targetCanvas = document.createElement('canvas');
        targetCanvas.id = canvasSelector.substring(1);
        document.body.appendChild(targetCanvas).style.display = 'none';
    }
    
    modalEl.classList.add('is-rendering');
    await html2canvas(modalEl, { backgroundColor: null, canvas: targetCanvas, width: 1280, height: 960 });
    modalEl.classList.remove('is-rendering');
    
    holographicPanel.setAttribute('canvas-texture', canvasSelector);
    holographicPanel.setAttribute('visible', true);
    vrState.holographicPanelVisible = true;
    AudioManager.playSfx('uiModalOpen');
  }

  closeHolographicPanelBtn.addEventListener('click', () => {
    holographicPanel.setAttribute('visible', false);
    vrState.holographicPanelVisible = false;
    AudioManager.playSfx('uiModalClose');
  });

  function startOrreryEncounter(bossList) {
    state.customOrreryBosses = bossList;
    state.arenaMode = true;
    restartCurrentStage();
  }
  
  function restartCurrentStage() {
    for (const el of entityMap.values()) { el.remove(); }
    entityMap.clear();

    resetGame(state.arenaMode);
    applyAllTalentEffects();
    vrState.lastCoreUse = -Infinity;
    
    vrState.avatarPos.set(0, SPHERE_RADIUS, 0);
    const uv = spherePosToUv(vrState.avatarPos, SPHERE_RADIUS);
    state.player.x = uv.u * canvas.width;
    state.player.y = uv.v * canvas.height;

    if (!state.currentStage || state.currentStage < 1 || state.currentStage > STAGE_CONFIG.length) {
      state.currentStage = 1;
    }
    spawnBossesForStage(state.currentStage);
    vrState.isGameRunning = true;
    console.log(`Stage ${state.currentStage} started.`);
  }

  function animate() {
    requestAnimationFrame(animate);
    const now = Date.now();
    if (!vrState.isGameRunning || state.isPaused) return;

    const cursorUv = vrState.cursorPoint.length() > 0 ? spherePosToUv(vrState.cursorPoint, SPHERE_RADIUS) : spherePosToUv(vrState.avatarPos, SPHERE_RADIUS);
    window.mousePosition = { x: cursorUv.u * canvas.width, y: cursorUv.v * canvas.height };
    
    gameTick(window.mousePosition.x, window.mousePosition.y);

    if (vrState.cursorPoint.length() > 0) {
        moveTowards(vrState.avatarPos, vrState.cursorPoint, state.player.speed, SPHERE_RADIUS);
        nexusAvatar.object3D.position.copy(vrState.avatarPos);
        nexusAvatar.object3D.lookAt(0, 0, 0);
        const newUv = spherePosToUv(vrState.avatarPos, SPHERE_RADIUS);
        state.player.x = newUv.u * canvas.width;
        state.player.y = newUv.v * canvas.height;
    }

    const activeEntities = new Set();
    const allGameObjects = [...state.enemies, ...state.pickups, ...state.effects, ...state.decoys];

    allGameObjects.forEach(obj => {
        const id = obj.instanceId || obj.type + obj.startTime + obj.x;
        if (!id) return;
        activeEntities.add(id);
        let el = entityMap.get(id);
        const pos = uvToSpherePos(obj.x / canvas.width, obj.y / canvas.height, SPHERE_RADIUS);

        if (!el) {
            el = document.createElement('a-entity');
            entityMap.set(id, el);
            effectContainer.appendChild(el);
            if (obj.boss) {
                el.setAttribute('geometry', 'primitive: sphere; radius: 0.5');
                el.setAttribute('material', `color: ${obj.color || '#e74c3c'}; emissive: ${obj.color || '#e74c3c'}; emissiveIntensity: 0.4`);
            } else if (obj.type && powers[obj.type] || obj.type === 'custom' || obj.type === 'rune_of_fate') {
                el.setAttribute('geometry', 'primitive: dodecahedron; radius: 0.2');
                el.setAttribute('material', `color: ${obj.emoji === '🩸' ? '#800020' : '#2ecc71'}; emissive: ${obj.emoji === '🩸' ? '#800020' : '#2ecc71'}; emissiveIntensity: 0.6`);
            } else if (obj.type === 'shockwave') {
                el.setAttribute('geometry', `primitive: torus; radius: 0; radiusTubular: 0.05`);
                el.setAttribute('material', `color: ${obj.color || '#FFFFFF'}; side: double; transparent: true`);
            } else if(obj.r) { // Default enemy
                el.setAttribute('geometry', `primitive: sphere; radius: 0.2`);
                el.setAttribute('material', `color: ${obj.customColor || '#c0392b'}; emissive: ${obj.customColor || '#c0392b'}; emissiveIntensity: 0.4`);
            }
        }
        el.object3D.position.copy(pos);
        el.object3D.lookAt(0, 0, 0);

        if (obj.type === 'shockwave') {
            const radius = (obj.radius / canvas.width) * SPHERE_RADIUS;
            el.setAttribute('geometry', `radius: ${radius}`);
            const progress = obj.radius / obj.maxRadius;
            el.setAttribute('material', 'opacity', Math.max(0, 1 - progress));
        }
    });

    for (const [id, el] of entityMap.entries()) {
        if (!activeEntities.has(id)) {
            el.remove();
            entityMap.delete(id);
        }
    }

    updateVrUiText();
    if (state.gameOver) {
      vrState.isGameRunning = false;
      // You can add a 3D game over panel here if desired
      console.log("GAME OVER");
    }
  }

  function updateVrUiText() {
    const health = state.player.health ?? 0;
    const maxHealth = state.player.maxHealth ?? 100;
    document.getElementById('healthText')?.setAttribute('value', `Health: ${Math.round(health)}/${Math.round(maxHealth)}`);
    document.getElementById('levelText')?.setAttribute('value', `Level: ${state.player.level}`);
    document.getElementById('stageText')?.setAttribute('value', `Stage: ${state.currentStage}`);
    document.getElementById('apText')?.setAttribute('value', `AP: ${state.player.ascensionPoints}`);
    document.getElementById('essenceText')?.setAttribute('value', `Essence: ${Math.floor(state.player.essence)}`);
    
    const activeBoss = state.enemies.find(e => e.boss);
    const bossPanel = document.getElementById('bossHealthPanel');
    if (activeBoss) {
        bossPanel.setAttribute('visible', true);
        document.getElementById('bossNameText')?.setAttribute('value', activeBoss.name);
        const hpFill = document.getElementById('bossHpBarFill');
        const ratio = Math.max(0, activeBoss.hp / activeBoss.maxHP);
        hpFill.object3D.scale.x = ratio;
        hpFill.object3D.position.x = (ratio - 1) * (1.8 / 2);
    } else {
        bossPanel.setAttribute('visible', false);
    }
  }

  // --- Initialize & Start ---
  loadPlayerState();
  applyAllTalentEffects();
  drawGrid(document.getElementById('gridCanvas'));
  
  battleSphere.addEventListener('raycaster-intersection', e => {
    const hit = e.detail.intersections[0];
    if (hit) vrState.cursorPoint.copy(hit.point);
  });
  battleSphere.addEventListener('raycaster-intersection-cleared', () => vrState.cursorPoint.set(0, 0, 0));
  
  function setupController(hand) {
    let triggerDown = false;
    hand.addEventListener('triggerdown', () => {
        triggerDown = true;
        setTimeout(() => {
            if(triggerDown) {
                const powerKey = (hand === leftHand) ? state.offensiveInventory[0] : state.defensiveInventory[0];
                if (powerKey) usePower(powerKey);
            }
        }, 150); // Delay to check for double-trigger
    });
    hand.addEventListener('triggerup', () => { triggerDown = false; });
  }
  setupController(leftHand);
  setupController(rightHand);

  sceneEl.addEventListener('loaded', () => {
    commandDeck.object3D.position.y = -0.6;
    createCommandCluster();
    AudioManager.setup(Array.from(document.querySelectorAll('.game-audio')), document.getElementById('soundOptionsToggle'));
  });

  sceneEl.addEventListener('enter-vr', () => {
    commandDeck.object3D.position.y = -0.6;
    restartCurrentStage();
  });

  animate();
});
