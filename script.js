// script.js – VR runtime for Eternal Momentum
// -----------------------------------------------------------------------------
// Updated 2025‑07‑28.  Implements every Phase 1 requirement in README,
// including command‑deck anchoring, 3‑D Momentum movement, reliable stage
// start, entity spawning on the inner surface of the battle‑sphere, the neon
// grid floor, and holographic UI panels.  Based on the specification in
// README.md 
//
// NOTE: No original code has been removed.  Superseded blocks are only
// commented so your history and diff tools continue to work.

import { gameTick, spawnBossesForStage } from './modules/gameLoop.js';
import { state, resetGame, savePlayerState, loadPlayerState } from './modules/state.js';
import { activateCorePower } from './modules/cores.js';
import { powers, usePower } from './modules/powers.js';
import { applyAllTalentEffects, renderAscensionGrid } from './modules/ascension.js';
import { populateAberrationCoreMenu, populateOrreryMenu, showBossInfo, populateLevelSelect, showCustomConfirm } from './modules/ui.js';
import { uvToSpherePos, spherePosToUv, safeAddEventListener } from './modules/utils.js';
import { moveTowards } from './modules/movement3d.js';
import { updateEnemies3d } from './modules/enemyAI3d.js';
import { updateProjectiles3d } from './modules/projectilePhysics3d.js';
import { AudioManager } from './modules/audio.js';
import { STAGE_CONFIG } from './modules/config.js';
import { Telemetry, storeTelemetry } from './modules/telemetry.js';
import { build as buildVrHud, updateHud } from './modules/vrCommandCluster.js';

// -----------------------------------------------------------------------------
// A‑Frame helper: apply a live canvas as a texture to any mesh.
// -----------------------------------------------------------------------------
AFRAME.registerComponent('canvas-texture', {
  schema: { type: 'selector' },
  init() {
    const canvas = this.data;
    if (!canvas) return;
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.el.addEventListener('model-loaded', () => this.applyTexture());
    if (this.el.getObject3D('mesh')) this.applyTexture();
  },
  applyTexture() {
    const mesh = this.el.getObject3D('mesh');
    if (!mesh) return;
    const apply = m => { m.map = this.texture; m.needsUpdate = true; };
    Array.isArray(mesh.material) ? mesh.material.forEach(apply) : apply(mesh.material);
  },
  tick() {
    if(this.texture && this.data._needsUpdate){
      this.texture.needsUpdate = true;
      this.data._needsUpdate = false;
    }
  }
});

// -----------------------------------------------------------------------------
// Simple collision component for enemies. Checks distance to the Nexus avatar
// each frame and emits a `hit-player` event when within range. This is a
// lightweight alternative to a full physics system and improves hit detection
// accuracy in 3D space.
// -----------------------------------------------------------------------------
AFRAME.registerComponent('enemy-hitbox', {
  schema: { radius: { type: 'number', default: 0.2 } },
  init() {
    this.avatar = document.getElementById('nexusAvatar');
  },
  tick() {
    if(!this.avatar) return;
    const playerPos = this.avatar.object3D.position;
    const enemyPos  = this.el.object3D.position;
    if(playerPos.distanceTo(enemyPos) < this.data.radius + 0.3){
      this.el.emit('hit-player');
    }
  }
});

// ---------------------------------------------------------------------------
// Component to keep entities fixed in world space. Does nothing each frame
// but serves as a clear marker that the object should never follow the camera.
// ---------------------------------------------------------------------------
AFRAME.registerComponent('world-stationary', {
  tick() {}
});

// -----------------------------------------------------------------------------
// Main initialisation sequence – runs once DOM is ready.
// -----------------------------------------------------------------------------
window.addEventListener('load', () => {
  // --- Off‑screen legacy canvas ------------------------------------------------
  let canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    document.body.appendChild(canvas).style.display = 'none';
  }
  canvas.width = 2048;
  canvas.height = 1024;

  // --- Cache frequently‑used scene nodes --------------------------------------
  const sceneEl     = document.querySelector('a-scene');
  const commandDeck = document.getElementById('commandDeck');
  const cameraEl    = document.getElementById('camera');
  const battleSphere= document.getElementById('battleSphere');
  const nexusAvatar = document.getElementById('nexusAvatar');
  const enemyContainer   = document.getElementById('enemyContainer');
  const pickupContainer  = document.getElementById('pickupContainer');
  const projectileContainer = document.getElementById('projectileContainer');
  const effectContainer  = document.getElementById('effectContainer');
  const telegraphContainer = document.getElementById("telegraphContainer");
  const crosshair        = document.getElementById('crosshair');
  const loadingScreen    = document.getElementById('loadingScreen');
  const loadingProgressFill = document.getElementById('loadingProgressFill');
  const loadingStatusText   = document.getElementById('loadingStatusText');
  const homeScreen      = document.getElementById('homeScreen');
  const startVrBtn      = document.getElementById('startVrBtn');
  const continueVrBtn   = document.getElementById('continueVrBtn');
  const eraseVrBtn      = document.getElementById('eraseVrBtn');
  const fadeOverlay     = document.getElementById('fadeOverlay');
  // let   recenterPrompt;
  const holographicPanel = document.getElementById('holographicPanel');
  const closeHoloBtn     = document.getElementById('closeHolographicPanelBtn');
  const gameOverPanel    = document.getElementById('gameOverPanel');
  const retryBtn         = document.getElementById('retryBtn');
  const gameOverAscBtn   = document.getElementById('gameOverAscBtn');
  const gameOverCoreBtn  = document.getElementById('gameOverCoreBtn');
  const gameOverStageBtn = document.getElementById('gameOverStageBtn');
  const leftHand  = document.getElementById('leftHand');
  const rightHand = document.getElementById('rightHand');
  const motionPermissionModal = document.getElementById('motionPermissionModal');
  const motionAllowBtn = document.getElementById('motionAllowBtn');
  const motionDenyBtn = document.getElementById('motionDenyBtn');
  let pendingStartReset = false;

  const assetsEl = document.querySelector('a-assets');
  if(sceneEl && assetsEl && loadingScreen){
    let assetsLoaded = false;

    const showHomeScreen = () => {
      loadingScreen.style.display = 'none';
      if(homeScreen){
        homeScreen.style.display = 'flex';
        requestAnimationFrame(()=>homeScreen.classList.add('visible'));
      }
    };

    assetsEl.addEventListener('progress', e => {
      const pct = Math.round((e.detail.loaded / e.detail.total) * 100);
      if(loadingProgressFill) loadingProgressFill.style.width = pct + '%';
      if(loadingStatusText) loadingStatusText.innerText = `Loading ${pct}%`;
    });

    const onAssetsLoaded = async () => {
      assetsLoaded = true;
      await preRenderPanels();
      const saveExists = !!localStorage.getItem('eternalMomentumSave');
      if(continueVrBtn) continueVrBtn.style.display = saveExists ? 'block' : 'none';
      if(eraseVrBtn)    eraseVrBtn.style.display    = saveExists ? 'block' : 'none';
      if(loadingProgressFill) loadingProgressFill.style.width = '100%';
      if(loadingStatusText) loadingStatusText.innerText = 'Loading Complete';
      showHomeScreen();
    };

    if(sceneEl.hasLoaded) onAssetsLoaded();
    else safeAddEventListener(sceneEl,'loaded', onAssetsLoaded);

    // Fallback: show home screen even if assets fail to fire "loaded"
    setTimeout(() => {
      if(!assetsLoaded) showHomeScreen();
    }, 10000);
  } else if(loadingScreen){
    loadingScreen.style.display = 'none';
  }

  async function startVr(resetSave=false){
    if(resetSave){
      localStorage.removeItem('eternalMomentumSave');
      loadPlayerState();
    }
    if(homeScreen){
      homeScreen.classList.remove('visible');
      homeScreen.addEventListener('transitionend',()=>{ homeScreen.style.display='none'; },{once:true});
    }
    if(fadeOverlay){
      fadeOverlay.classList.add('visible');
      await new Promise(r=>setTimeout(r,500));
    }
    sceneEl.enterVR();
    if(fadeOverlay){
      setTimeout(()=>fadeOverlay.classList.remove('visible'),500);
    }
  }

  function needsMotionPermission(){
    return typeof DeviceMotionEvent !== 'undefined' &&
           typeof DeviceMotionEvent.requestPermission === 'function' &&
           !localStorage.getItem('motionPermissionGranted');
  }

  async function handleMotionAllow(){
    if(motionPermissionModal) motionPermissionModal.style.display = 'none';
    if(typeof DeviceMotionEvent !== 'undefined' &&
       typeof DeviceMotionEvent.requestPermission === 'function'){
      try{
        const res = await DeviceMotionEvent.requestPermission();
        localStorage.setItem('motionPermissionGranted', res);
      }catch(e){}
    }
    startVr(pendingStartReset);
  }

  function handleMotionDeny(){
    if(motionPermissionModal) motionPermissionModal.style.display = 'none';
    startVr(pendingStartReset);
  }

  function handleStartClick(resetSave){
    if(needsMotionPermission() && motionPermissionModal){
      pendingStartReset = resetSave;
      motionPermissionModal.style.display = 'flex';
    } else {
      startVr(resetSave);
    }
  }

  if(motionAllowBtn){
    safeAddEventListener(motionAllowBtn,'click',handleMotionAllow);
  }
  if(motionDenyBtn){
    safeAddEventListener(motionDenyBtn,'click',handleMotionDeny);
  }
  if(startVrBtn){
    safeAddEventListener(startVrBtn,'click',()=>handleStartClick(true));
  }
  if(continueVrBtn){
    safeAddEventListener(continueVrBtn,'click',()=>handleStartClick(false));
  }
  if(eraseVrBtn){
    safeAddEventListener(eraseVrBtn,'click',()=>{
      showCustomConfirm(
        '|| SEVER TIMELINE? ||',
        'All progress will be lost. This cannot be undone.',
        () => { localStorage.removeItem('eternalMomentumSave'); window.location.reload(); }
      );
    });
  }

  const SPHERE_RADIUS = 24;
  const BOSS_DAMAGE_MULTIPLIER = 0.75;

  const DEFAULT_SETTINGS = {
    turnSpeed: 1.0,
    vignetteIntensity: 0.4,
    turnStyle: 'smooth',
    telemetryEnabled: false,
    musicVolume: 0.35,
    sfxVolume: 0.85,
    highContrast: false
  };

  const userSettings = {
    turnSpeed: parseFloat(localStorage.getItem('turnSpeed')) || DEFAULT_SETTINGS.turnSpeed,
    vignetteIntensity: parseFloat(localStorage.getItem('vignetteIntensity')) || DEFAULT_SETTINGS.vignetteIntensity,
    turnStyle: localStorage.getItem('turnStyle') || DEFAULT_SETTINGS.turnStyle,
    telemetryEnabled: localStorage.getItem('telemetryEnabled') === 'true',
    musicVolume: parseFloat(localStorage.getItem('musicVolume')) || DEFAULT_SETTINGS.musicVolume,
    sfxVolume: parseFloat(localStorage.getItem('sfxVolume')) || DEFAULT_SETTINGS.sfxVolume,
    highContrast: localStorage.getItem('highContrast') === 'true'
  };

  const CROSSHAIR_COLOR = '#00ffff';
  const CROSSHAIR_BASE_SCALE = 0.08 * (8 / SPHERE_RADIUS);
  let CROSSHAIR_SCALE_MULT = CROSSHAIR_BASE_SCALE;
  const entityMap = new Map();  // maps game objects → A‑Frame entities
  const previousPositions = new Map(); // tracks last position for orientation
  const panelCache = new Map(); // caches html2canvas results
  const canvasPool = [];
  let currentCanvas = null;
  const projectilePool = [];
  const enemyPool = [];
  const effectPool = [];
  const pickupPool = [];

  function obtainCanvas(id){
    const c = canvasPool.pop() || document.createElement('canvas');
    c.id = id;
    c.width = 1280;
    c.height = 960;
    document.body.appendChild(c).style.display = 'none';
    c._needsUpdate = true;
    return c;
  }

  function releaseCanvas(c){
    if(c.parentElement) c.parentElement.removeChild(c);
    c._needsUpdate = false;
    canvasPool.push(c);
  }

  // --- VR‑only runtime state ---------------------------------------------------
  const vrState = {
    cursorPoint: new THREE.Vector3(),
    avatarPos:  new THREE.Vector3(),
    isGameRunning: false,
    holographicPanelVisible: false,
    stageSelectOpen: false,
    stageSelectIndex: 1,
    lastCoreUse: -Infinity,
    leftTriggerDown: false,
    rightTriggerDown: false,
    activeModal: null
  };

  const tutorial = { step:-1, el:null };

  function pulseControllers(duration = 50, strength = 0.5){
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for(const gp of pads){
      if(gp && gp.hapticActuators && gp.hapticActuators[0]){
        try{ gp.hapticActuators[0].pulse(strength, duration); }catch(e){}
      }
    }
  }
  window.pulseControllers = pulseControllers;

  function saveSettings(){
    localStorage.setItem('turnSpeed', userSettings.turnSpeed);
    localStorage.setItem('vignetteIntensity', userSettings.vignetteIntensity);
    localStorage.setItem('turnStyle', userSettings.turnStyle);
    localStorage.setItem('telemetryEnabled', userSettings.telemetryEnabled);
    localStorage.setItem('musicVolume', userSettings.musicVolume);
    localStorage.setItem('sfxVolume', userSettings.sfxVolume);
    localStorage.setItem('highContrast', userSettings.highContrast);
  }

  function applySettings(){
    // Crosshair uses a fixed scale and color in VR
    if(crosshair){
      crosshair.querySelectorAll('a-ring, a-plane').forEach(el=>{
        el.setAttribute('material', `color:${CROSSHAIR_COLOR}; emissive:${CROSSHAIR_COLOR}; emissiveIntensity:0.9; side:double`);
      });
    }
    const vignetteEl = document.getElementById('vignette');
    if(vignetteEl){
      vignetteEl.setAttribute('opacity', userSettings.vignetteIntensity);
      vignetteEl.setAttribute('visible', userSettings.vignetteIntensity > 0);
    }
    AudioManager.setMusicVolume(userSettings.musicVolume);
    AudioManager.setSfxVolume(userSettings.sfxVolume);
    applyHighContrastMode();
    updateUiScale();
  }

  function updateUiScale(){
    if(!commandDeck) return;
    const base=1024;
    const factor=Math.min(window.innerWidth, window.innerHeight)/base;
    const s=Math.min(1.5, Math.max(0.7, factor));
    commandDeck.object3D.scale.set(s,s,s);
    // scale crosshair with deck so it remains proportionate
    // user cannot change size directly
    CROSSHAIR_SCALE_MULT = CROSSHAIR_BASE_SCALE * s;
  }


  function applyHighContrastMode(){
    const contrast=userSettings.highContrast;
    document.body.classList.toggle('high-contrast', contrast);
    const hbBg=document.getElementById('vrHealthBg');
    hbBg && hbBg.setAttribute('material',`color:${contrast?'#000':'#111'}; opacity:0.9`);
    const hbFill=document.getElementById('vrHealthFill');
    hbFill && hbFill.setAttribute('material',`color:${contrast?'#ffff00':'#ff5555'}; emissive:${contrast?'#ffff00':'#ff5555'}; emissiveIntensity:0.8`);
    const shFill=document.getElementById('vrShieldFill');
    shFill && shFill.setAttribute('material',`color:#00ffff; opacity:${contrast?'0.8':'0.5'}; emissive:#00ffff; emissiveIntensity:${contrast?'0.8':'0.5'}`);
    const hbText=document.getElementById('vrHealthText');
    hbText && hbText.setAttribute('color',contrast?'#ffffff':'#eaf2ff');
    const bbBg=document.getElementById('vrBossBg');
    bbBg && bbBg.setAttribute('material',`color:${contrast?'#000':'#111'}; opacity:0.9`);
    const bbFill=document.getElementById('vrBossFill');
    bbFill && bbFill.setAttribute('material',`color:${contrast?'#ff00ff':'#e74c3c'}; emissive:${contrast?'#ff00ff':'#e74c3c'}; emissiveIntensity:0.8`);
    const bbText=document.getElementById('vrBossName');
    bbText && bbText.setAttribute('color',contrast?'#ffffff':'#eaf2ff');
    const ascBg=document.getElementById('vrAscBg');
    ascBg && ascBg.setAttribute('material',`color:${contrast?'#000':'#111'}; opacity:0.9`);
    const ascFill=document.getElementById('vrAscensionFill');
    ascFill && ascFill.setAttribute('material',`color:${contrast?'#00ff00':'#8e44ad'}; emissive:${contrast?'#00ff00':'#8e44ad'}; emissiveIntensity:0.8`);
    const ascText=document.getElementById('vrAscensionText');
    ascText && ascText.setAttribute('color',contrast?'#ffffff':'#eaf2ff');
    const apText=document.getElementById('vrApDisplay');
    apText && apText.setAttribute('color',contrast?'#ffffff':'#eaf2ff');
    const defBase=document.getElementById('vrDefBase');
    defBase && defBase.setAttribute('material',`color:${contrast?'#000':'#141428'}; emissive:#00ffff; emissiveIntensity:${contrast?'0.7':'0.4'}; opacity:0.95; transparent:true`);
    const offBase=document.getElementById('vrOffBase');
    offBase && offBase.setAttribute('material',`color:${contrast?'#000':'#141428'}; emissive:#ff00ff; emissiveIntensity:${contrast?'0.7':'0.4'}; opacity:0.95; transparent:true`);
    const defText=document.getElementById('vrDefEmoji');
    defText && defText.setAttribute('color',contrast?'#ffffff':'#eaf2ff');
    const offText=document.getElementById('vrOffEmoji');
    offText && offText.setAttribute('color',contrast?'#ffffff':'#eaf2ff');
    if(crosshair){
      const c = contrast ? '#ffffff' : CROSSHAIR_COLOR;
      crosshair.querySelectorAll('a-ring, a-plane').forEach(el=>{
        el.setAttribute('material', `color:${c}; emissive:${c}; emissiveIntensity:0.9; side:double`);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Helper: position the command deck at a fixed world location so it
  // never moves with the player's headset.  Called on scene load and when
  // entering VR to ensure the deck is at waist height relative to the
  // origin and remains horizontally aligned.
  // ---------------------------------------------------------------------------
  function anchorCommandDeck() {
    if(!sceneEl||!commandDeck) return;
    if(commandDeck.parentElement !== sceneEl){
      sceneEl.appendChild(commandDeck);
    }
    // Fixed world position per design doc
    commandDeck.object3D.position.set(0, 1.0, 0);
    commandDeck.object3D.rotation.set(0, 0, 0);
  }

  function createDeckFloor(){
    if(document.getElementById('deckFloor')) return;
    const deckFloor=document.createElement('a-circle');
    deckFloor.setAttribute('id','deckFloor');
    deckFloor.setAttribute('radius',3);
    deckFloor.setAttribute('rotation','-90 0 0');
    deckFloor.setAttribute('material','shader:flat; transparent:true; opacity:0.6; side:double');
    deckFloor.setAttribute('canvas-texture','#gridCanvas');
    commandDeck.appendChild(deckFloor);
  }

  // ---------------------------------------------------------------------------
  // Helper: move the command deck to the player's current position without
  // attaching it to the headset.  Useful if the player drifts away from the
  // origin in room‑scale play.
  // ---------------------------------------------------------------------------
  function recenterCommandDeck(){
    if(!commandDeck || !cameraEl) return;
    cameraEl.object3D.getWorldPosition(_tempVec);
    commandDeck.object3D.position.set(_tempVec.x, 1.0, _tempVec.z);
  }
  window.recenterCommandDeck = recenterCommandDeck;

  // ---------------------------------------------------------------------------
  // Helper: draw the neon‑grid floor texture once at start‑up.
  // ---------------------------------------------------------------------------
  function drawGrid(c) {
    const g = c.getContext('2d');
    const s = c.width;
    g.fillStyle = '#050510'; g.fillRect(0,0,s,s);
    g.strokeStyle = 'rgba(0,255,255,0.5)'; g.lineWidth = 4;
    const step = s/10;
    for (let i=0;i<=10;i++){
      g.beginPath(); g.moveTo(i*step,0); g.lineTo(i*step,s); g.stroke();
      g.beginPath(); g.moveTo(0,i*step); g.lineTo(s,i*step); g.stroke();
    }
    c._needsUpdate = true;
  }

  function drawButtonTexture(c){
    const g = c.getContext('2d');
    const s = c.width;
    const grad = g.createRadialGradient(s/2,s/2,2,s/2,s/2,s/2);
    grad.addColorStop(0,'#0b1020');
    grad.addColorStop(0.8,'#0b1020');
    grad.addColorStop(1,'#00ffff');
    g.fillStyle = grad;
    g.fillRect(0,0,s,s);
    c._needsUpdate = true;
  }

  const _tempVec = new THREE.Vector3();
  function scaleCrosshair(pos){
    if(!crosshair||!cameraEl) return;
    cameraEl.object3D.getWorldPosition(_tempVec);
    const dist = _tempVec.distanceTo(pos);
    const s = dist * CROSSHAIR_SCALE_MULT;
    crosshair.object3D.scale.set(s,s,s);
  }

  // ---------------------------------------------------------------------------
  // Helpers: holographic panels for menus and core equipment handling
  // ---------------------------------------------------------------------------
  function equipCore(coreId){
    state.player.equippedAberrationCore = coreId;
    savePlayerState();
    populateAberrationCoreMenu(onCoreEquip);
    updateUI();
  }

  function onCoreEquip(coreId){
    const isEquipped = state.player.equippedAberrationCore === coreId;
    if(vrState.isGameRunning && !state.gameOver && !isEquipped){
      showCustomConfirm(
        '|| DESTABILIZE TIMELINE? ||',
        'Attuning a new Aberration Core requires a full system recalibration. The current timeline will collapse, forcing a restart of the stage. Do you wish to proceed?',
        () => {
          equipCore(coreId);
          holographicPanel.setAttribute('visible',false);
          vrState.holographicPanelVisible = false;
          initialiseStage();
        }
      );
    } else if(!isEquipped){
      equipCore(coreId);
    }
  }

  function startOrreryEncounter(bossList){
    resetGame(true);
    applyAllTalentEffects();
    state.customOrreryBosses = bossList;
    state.currentStage = 999;
    holographicPanel.setAttribute('visible',false);
    vrState.holographicPanelVisible = false;
    initialiseStage();
  }

  async function openAscensionPanel(){
    document.getElementById('ap-total-asc-grid').innerText = state.player.ascensionPoints;
    renderAscensionGrid();
    await showHolographicPanel('#ascensionGridModal','#ascensionGridCanvas');
  }

  async function openCorePanel(){
    populateAberrationCoreMenu(onCoreEquip);
    await showHolographicPanel('#aberrationCoreModal','#aberrationCanvas');
  }

  async function openOrreryPanel(){
    populateOrreryMenu(startOrreryEncounter);
    await showHolographicPanel('#orreryModal','#orreryCanvas');
  }

  async function openLevelSelectPanel(){
    vrState.stageSelectIndex = state.currentStage;
    updateStageSelectDisplay();
    await showHolographicPanel('#levelSelectModal','#levelSelectCanvas');
    vrState.stageSelectOpen = true;
  }

  function updateStageSelectDisplay(){
    const title=document.getElementById('stageSelectTitle');
    const stage=document.getElementById('stageSelectStage');
    if(title) title.setAttribute('value','SELECT STAGE');
    if(stage) stage.setAttribute('value',`STAGE ${vrState.stageSelectIndex}`);
  }

  async function openSettingsPanel(){
    const turn = document.getElementById('turnSpeedRange');
    const vig  = document.getElementById('vignetteRange');
    const music= document.getElementById('musicVolumeRange');
    const sfx  = document.getElementById('sfxVolumeRange');
    const styleSel = document.getElementById('turnStyleSelect');
    const tele = document.getElementById('telemetryToggle');
    const hcToggle = document.getElementById('highContrastToggle');
    if(turn){ turn.value = userSettings.turnSpeed; }
    if(vig){ vig.value = userSettings.vignetteIntensity; }
    if(music){ music.value = userSettings.musicVolume; }
    if(sfx){ sfx.value = userSettings.sfxVolume; }
    if(styleSel){ styleSel.value = userSettings.turnStyle; }
    if(tele){ tele.checked = userSettings.telemetryEnabled; }
    if(hcToggle){ hcToggle.checked = userSettings.highContrast; }
    await showHolographicPanel('#settingsModal','#settingsCanvas');
  }

  async function openTelemetryPanel(){
    const content=document.getElementById('telemetryModalContent');
    if(content){
      const logs=JSON.parse(localStorage.getItem('telemetryLogs')||'[]');
      const lines=logs.slice(-5).map(l=>{
        const t=new Date(l.ts).toLocaleTimeString();
        return `${t} - ${l.fps}fps`;
      });
      content.innerText = lines.join('\n');
    }
    await showHolographicPanel('#telemetryModal','#telemetryCanvas');
  }

  function showGameOverPanel(){
    if(gameOverPanel){
      gameOverPanel.setAttribute('visible', true);
    }
    vrState.isGameRunning = false;
  }

  function hideGameOverPanel(){
    if(gameOverPanel){
      gameOverPanel.setAttribute('visible', false);
    }
  }

  if(retryBtn) safeAddEventListener(retryBtn,'click',()=>{ hideGameOverPanel(); initialiseStage(); });
  if(gameOverAscBtn) safeAddEventListener(gameOverAscBtn,'click',async ()=>{ hideGameOverPanel(); await openAscensionPanel(); });
  if(gameOverCoreBtn) safeAddEventListener(gameOverCoreBtn,'click',async ()=>{ hideGameOverPanel(); await openCorePanel(); });
  if(gameOverStageBtn) safeAddEventListener(gameOverStageBtn,'click',async ()=>{ hideGameOverPanel(); await openLevelSelectPanel(); });

  // ---------------------------------------------------------------------------
  // Helper: build the command‑cluster deck & buttons programmatically.
  // ---------------------------------------------------------------------------
  function createCommandCluster(){
    if (commandDeck.children.length) return; // already built

    // Deck floor – uses gridCanvas for emissive glow
    const deckFloor = document.createElement('a-circle');
    deckFloor.setAttribute('id','deckFloor');
    deckFloor.setAttribute('radius',3);
    deckFloor.setAttribute('rotation','-90 0 0');
    deckFloor.setAttribute('material','shader:flat; transparent:true; opacity:0.6; side:double');
    deckFloor.setAttribute('canvas-texture','#gridCanvas');
    commandDeck.appendChild(deckFloor);

    // Functional console buttons
    const buttons = {
      stages:   {angle:-70, r:1.05, y:0.25, emoji:"🎯", label:"Stages",   action:openLevelSelectPanel},
      ascension:{angle:-40, r:1.00, y:0.30, emoji:"🜂", label:"Ascension", action:openAscensionPanel},
      cores:    {angle:-10, r:1.05, y:0.25, emoji:"⭐", label:"Cores",     action:openCorePanel},
      orrery:   {angle: 20, r:1.05, y:0.20, emoji:"🪐", label:"Orrery",    action:openOrreryPanel},
      resume:   {angle: 50, r:1.05, y:0.15, emoji:"▶", label:"Resume",   action:()=>vrState.isGameRunning=true},
      sound:    {angle: 80, r:1.05, y:0.10, emoji:"🔊", label:"Sound",    action:()=>AudioManager.toggleMute()},
      settings: {angle:100, r:1.05, y:0.10, emoji:"⚙️", label:"Settings", action:openSettingsPanel},
      recenter: {angle:120, r:1.05, y:0.10, emoji:"📍", label:"Center",  action:recenterCommandDeck},
      telemetry:{angle:140, r:1.05, y:0.10, emoji:"📊", label:"Telemetry", action:openTelemetryPanel}
    };

    Object.entries(buttons).forEach(([id,cfg])=>{
      const wrapper=document.createElement('a-entity');
      wrapper.setAttribute('id',id);
      wrapper.classList.add('interactive');
      const ang=THREE.MathUtils.degToRad(cfg.angle);
      wrapper.object3D.position.set(Math.sin(ang)*cfg.r,cfg.y,-Math.cos(ang)*cfg.r);
      wrapper.object3D.lookAt(new THREE.Vector3(0,cfg.y,0));

      const ring=document.createElement('a-torus');
      ring.setAttribute('geometry','primitive: torus; radius:0.17; radiusTubular:0.01; segmentsTubular:20');
      ring.setAttribute('material','color:#00ffff; emissive:#00ffff; emissiveIntensity:0.6; opacity:0.45; transparent:true');
      ring.object3D.position.set(0,-0.035,0);
      wrapper.appendChild(ring);

      const base=document.createElement('a-cylinder');
      base.setAttribute('radius',0.15);
      base.setAttribute('height',0.02);
      base.setAttribute('material','shader: standard; color:#050510; emissive:#00ffff; emissiveIntensity:0.4; metalness:0.25; roughness:0.6');
      base.object3D.position.set(0,-0.03,0);
      wrapper.appendChild(base);

      const btn=document.createElement('a-entity');
      btn.setAttribute('mixin','console-button');
      btn.setAttribute('canvas-texture','#buttonCanvas');
      btn.classList.add('interactive');
      wrapper.appendChild(btn);

      const idAttr = id==='sound' ? 'id="soundOptionsToggle"' : '';
      btn.innerHTML=`<a-text ${idAttr} value="${cfg.emoji}" align="center" width="1" color="#eaf2ff" position="0 0 0.06"></a-text>`;

      const label=document.createElement('a-text');
      label.setAttribute('value',cfg.label);
      label.setAttribute('align','center');
      label.setAttribute('width','1.5');
      label.setAttribute('color','#eaf2ff');
      label.setAttribute('position','0 0.17 0.06');
      label.setAttribute('visible','false');
      label.setAttribute('look-at','#camera');
      btn.appendChild(label);

      btn.addEventListener('mouseenter',()=>{
        AudioManager.playSfx('uiHoverSound');
        pulseControllers(20, 0.3);
        label.setAttribute('visible',true);
      });
      btn.addEventListener('mouseleave',()=>label.setAttribute('visible',false));
      btn.addEventListener('click',async ()=>{
        AudioManager.playSfx('uiClickSound');
        pulseControllers(40, 0.6);
        if(cfg.action) await cfg.action();
      });
      commandDeck.appendChild(wrapper);
    });

    // recenter prompt no longer needed

    // --- Command cluster panels ------------------------------------------
    const cluster=document.createElement('a-entity');
    cluster.setAttribute('id','commandCluster');
    commandDeck.appendChild(cluster);

    function panelAt(angle,r=0.6){
      const p=document.createElement('a-entity');
      const rad=THREE.MathUtils.degToRad(angle);
      p.object3D.position.set(Math.sin(rad)*r,0.35,-Math.cos(rad)*r);
      p.object3D.lookAt(new THREE.Vector3(0,0.35,0));
      p.setAttribute('look-at','#camera');
      return p;
    }

    const leftPanel=panelAt(-40);
    const centerPanel=panelAt(0);
    const rightPanel=panelAt(40);
    cluster.appendChild(leftPanel);
    cluster.appendChild(centerPanel);
    cluster.appendChild(rightPanel);

    const hud=centerPanel;

    // Health / shield bar
    const healthGroup=document.createElement('a-entity');
    healthGroup.object3D.position.set(0,0.15,0);
    const hbBg=document.createElement('a-plane');
    hbBg.setAttribute('id','vrHealthBg');
    hbBg.setAttribute('width','0.6');
    hbBg.setAttribute('height','0.08');
    hbBg.setAttribute('material','color:#111; opacity:0.6');
    healthGroup.appendChild(hbBg);
    const hbFill=document.createElement('a-plane');
    hbFill.setAttribute('id','vrHealthFill');
    hbFill.setAttribute('width','0.6');
    hbFill.setAttribute('height','0.06');
    hbFill.setAttribute('material','color:#ff5555; emissive:#ff5555; emissiveIntensity:0.6');
    hbFill.object3D.position.set(0,0,0.01);
    healthGroup.appendChild(hbFill);
    const shFill=document.createElement('a-plane');
    shFill.setAttribute('id','vrShieldFill');
    shFill.setAttribute('width','0.6');
    shFill.setAttribute('height','0.06');
    shFill.setAttribute('material','color:#00ffff; opacity:0.5; emissive:#00ffff; emissiveIntensity:0.5');
    shFill.object3D.position.set(0,0,0.015);
    healthGroup.appendChild(shFill);
    const hbText=document.createElement('a-text');
    hbText.setAttribute('id','vrHealthText');
    hbText.setAttribute('value','100/100');
    hbText.setAttribute('align','center');
    hbText.setAttribute('width','0.6');
    hbText.setAttribute('color','#eaf2ff');
    hbText.object3D.position.set(0,0,0.02);
    healthGroup.appendChild(hbText);
    hud.appendChild(healthGroup);

    // Boss HP bar
    const bossGroup=document.createElement('a-entity');
    bossGroup.object3D.position.set(0,-0.05,0);
    const bbBg=document.createElement('a-plane');
    bbBg.setAttribute('id','vrBossBg');
    bbBg.setAttribute('width','1.2');
    bbBg.setAttribute('height','0.08');
    bbBg.setAttribute('material','color:#111; opacity:0.6');
    bossGroup.appendChild(bbBg);
    const bbFill=document.createElement('a-plane');
    bbFill.setAttribute('id','vrBossFill');
    bbFill.setAttribute('width','1.2');
    bbFill.setAttribute('height','0.06');
    bbFill.setAttribute('material','color:#e74c3c; emissive:#e74c3c; emissiveIntensity:0.6');
    bbFill.object3D.position.set(0,0,0.01);
    bossGroup.appendChild(bbFill);
    const bbText=document.createElement('a-text');
    bbText.setAttribute('id','vrBossName');
    bbText.setAttribute('value','');
    bbText.setAttribute('align','center');
    bbText.setAttribute('width','1.2');
    bbText.setAttribute('color','#eaf2ff');
    bbText.object3D.position.set(0,0,0.02);
    bossGroup.appendChild(bbText);
    hud.appendChild(bossGroup);

    // Ascension progress
    const ascGroup=document.createElement('a-entity');
    ascGroup.object3D.position.set(0,-0.15,0);
    const ascBg=document.createElement('a-plane');
    ascBg.setAttribute('id','vrAscBg');
    ascBg.setAttribute('width','0.8');
    ascBg.setAttribute('height','0.06');
    ascBg.setAttribute('material','color:#111; opacity:0.6');
    ascGroup.appendChild(ascBg);
    const ascFill=document.createElement('a-plane');
    ascFill.setAttribute('id','vrAscensionFill');
    ascFill.setAttribute('width','0.8');
    ascFill.setAttribute('height','0.04');
    ascFill.setAttribute('material','color:#8e44ad; emissive:#8e44ad; emissiveIntensity:0.6');
    ascFill.object3D.position.set(0,0,0.01);
    ascGroup.appendChild(ascFill);
    const ascText=document.createElement('a-text');
    ascText.setAttribute('id','vrAscensionText');
    ascText.setAttribute('value','LVL 1');
    ascText.setAttribute('align','center');
    ascText.setAttribute('width','0.8');
    ascText.setAttribute('color','#eaf2ff');
    ascText.object3D.position.set(0,0,0.02);
    ascGroup.appendChild(ascText);
    const apText=document.createElement('a-text');
    apText.setAttribute('id','vrApDisplay');
    apText.setAttribute('value','AP: 0');
    apText.setAttribute('align','center');
    apText.setAttribute('width','0.8');
    apText.setAttribute('color','#eaf2ff');
    apText.object3D.position.set(0,0.12,0.02);
    ascGroup.appendChild(apText);
    rightPanel.appendChild(ascGroup);

    // Ability slots
    const abilityGroup=document.createElement('a-entity');
    abilityGroup.object3D.position.set(0,-0.25,0);

    const defSlot3D=document.createElement('a-entity');
    defSlot3D.setAttribute('id','vrDefSlot');
    defSlot3D.object3D.position.set(-0.25,0,0);
    const defBase=document.createElement('a-circle');
    defBase.setAttribute('id','vrDefBase');
    defBase.setAttribute('radius',0.15);
    defBase.setAttribute('material','color:#141428; emissive:#00ffff; emissiveIntensity:0.4; opacity:0.95; transparent:true');
    defSlot3D.appendChild(defBase);
    const defText=document.createElement('a-text');
    defText.setAttribute('id','vrDefEmoji');
    defText.setAttribute('align','center');
    defText.setAttribute('width','0.6');
    defText.setAttribute('color','#eaf2ff');
    defText.object3D.position.set(0,0,0.02);
    defSlot3D.appendChild(defText);

    const offSlot3D=document.createElement('a-entity');
    offSlot3D.setAttribute('id','vrOffSlot');
    offSlot3D.object3D.position.set(0.25,0,0);
    const offBase=document.createElement('a-circle');
    offBase.setAttribute('id','vrOffBase');
    offBase.setAttribute('radius',0.17);
    offBase.setAttribute('material','color:#141428; emissive:#ff00ff; emissiveIntensity:0.4; opacity:0.95; transparent:true');
    offSlot3D.appendChild(offBase);
    const offText=document.createElement('a-text');
    offText.setAttribute('id','vrOffEmoji');
    offText.setAttribute('align','center');
    offText.setAttribute('width','0.7');
    offText.setAttribute('color','#eaf2ff');
    offText.object3D.position.set(0,0,0.02);
    offSlot3D.appendChild(offText);

    abilityGroup.appendChild(defSlot3D);
    abilityGroup.appendChild(offSlot3D);
    leftPanel.appendChild(abilityGroup);
  }

  function showTutorialStep(){
    if(tutorial.el) tutorial.el.remove();
    let text='';
    if(tutorial.step===0){
      text='Welcome! Aim with your controller and squeeze the trigger to begin.';
    }else if(tutorial.step===1){
      text='Aim at the sphere and squeeze the trigger to move.';
    }else if(tutorial.step===2){
      text='Great! Press either trigger again to fire your power.';
    }else if(tutorial.step===3){
      text='Press both triggers together to unleash your Core.';
    }else if(tutorial.step===4){
      text='Press the Center button or R if you drift too far.';
    }else{
      tutorial.el=null;
      localStorage.setItem('tutorialShown','1');
      return;
    }
    const tut=document.createElement('a-text');
    tut.setAttribute('id','tutorialPrompt');
    tut.setAttribute('value',text);
    tut.setAttribute('align','center');
    tut.setAttribute('width','3');
    tut.setAttribute('color','#00ffff');
    tut.setAttribute('position','0 0.8 0');
    tut.setAttribute('look-at','#camera');
    commandDeck.appendChild(tut);
    tutorial.el=tut;
  }

  function advanceTutorial(){
    tutorial.step++;
    showTutorialStep();
  }

  function showTutorialPrompt(){
    if(localStorage.getItem('tutorialShown')) return;
    tutorial.step=0;
    showTutorialStep();
  }

  // ---------------------------------------------------------------------------
  // Render a DOM modal to a canvas then apply it to the holographic plane.
  // ---------------------------------------------------------------------------
  async function renderPanel(modalSel, canvasSel){
    const modal = document.querySelector(modalSel);
    if(!modal) return null;
    let target = document.querySelector(canvasSel);
    if(!target){
      target = obtainCanvas(canvasSel.substring(1));
    }
    if(panelCache.has(modalSel)) target = panelCache.get(modalSel);
    modal.classList.add('is-rendering');
    target.width = 1280;
    target.height = 960;
    const render = async()=>{
      await html2canvas(modal,{backgroundColor:null,canvas:target,width:1280,height:960,scale:1});
    };
    if('requestIdleCallback' in window){
      await new Promise(r=>requestIdleCallback(async()=>{await render(); r();}));
    }else{
      await render();
    }
    modal.classList.remove('is-rendering');
    target._needsUpdate = true;
    panelCache.set(modalSel,target);
    return target;
  }

  async function showHolographicPanel(modalSel, canvasSel){
    if(vrState.holographicPanelVisible) return;
    const target = await renderPanel(modalSel, canvasSel);
    if(!target) return;
    await new Promise(r=>setTimeout(r,0));
    holographicPanel.setAttribute('canvas-texture',`#${target.id}`);
    holographicPanel.setAttribute('visible',true);
    vrState.holographicPanelVisible=true;
    vrState.activeModal = modalSel;
    currentCanvas = target;
    AudioManager.playSfx('uiModalOpen');
  }

  // Pre-render all holographic panels during loading so opening a menu
  // never causes a frame hitch.  Renders each modal to its off-screen
  // canvas exactly once and caches the texture for later use.
  async function preRenderPanels(){
    const panels = [
      ['#ascensionGridModal','#ascensionGridCanvas'],
      ['#aberrationCoreModal','#aberrationCanvas'],
      ['#orreryModal','#orreryCanvas'],
      ['#settingsModal','#settingsCanvas'],
      ['#levelSelectModal','#levelSelectCanvas'],
      ['#telemetryModal','#telemetryCanvas']
    ];
    for(const [modalSel,canvasSel] of panels){
      if(panelCache.has(modalSel)) continue;
      await renderPanel(modalSel, canvasSel);
      await new Promise(r=>setTimeout(r,50));
    }
  }
  safeAddEventListener(closeHoloBtn,'click',()=>{
    holographicPanel.setAttribute('visible',false);
    vrState.holographicPanelVisible=false;
    if(currentCanvas){
      releaseCanvas(currentCanvas);
      if(vrState.activeModal) panelCache.delete(vrState.activeModal);
      currentCanvas=null;
      vrState.activeModal=null;
    }
    AudioManager.playSfx('uiModalClose');
  });

  // ---------------------------------------------------------------------------
  // Initialise gameplay for the current stage. Called on load and when
  // the player respawns or enters VR. This resets state, positions the
  // avatar at the top of the battle sphere and spawns the appropriate
  // boss wave.
  // ---------------------------------------------------------------------------
  function initialiseStage(){
    for(const e of entityMap.values()) e.remove();
    entityMap.clear();
    previousPositions.clear();
    hideGameOverPanel();

    resetGame(state.arenaMode);
    applyAllTalentEffects();

    vrState.avatarPos.set(0, SPHERE_RADIUS, 0);
    const uv = spherePosToUv(vrState.avatarPos, SPHERE_RADIUS);
    state.player.x = uv.u * canvas.width;
    state.player.y = uv.v * canvas.height;

    nexusAvatar.setAttribute('visible', true);
    nexusAvatar.object3D.position.copy(vrState.avatarPos);
    nexusAvatar.object3D.lookAt(0, 0, 0);
    const nexusLabel = document.getElementById('nexusLabel');
    if(nexusLabel) nexusLabel.setAttribute('value','💠');

    if(crosshair){
      crosshair.setAttribute('visible', true);
      crosshair.object3D.position.copy(vrState.avatarPos);
      scaleCrosshair(vrState.avatarPos);
    }

    if(!state.currentStage || state.currentStage < 1 || state.currentStage > STAGE_CONFIG.length){
      state.currentStage = 1;
    }
    spawnBossesForStage(state.currentStage);
    AudioManager.playMusicForStage(state.currentStage);
    vrState.isGameRunning = true;
    showTutorialPrompt();
  }

  // Alias used by older code paths
  function restartCurrentStage(){
    initialiseStage();
  }

  function startSpecificLevel(levelNum){
    state.arenaMode = false;
    state.currentStage = levelNum;
    holographicPanel.setAttribute('visible', false);
    vrState.holographicPanelVisible = false;
    vrState.stageSelectOpen = false;
    initialiseStage();
  }

  // ---------------------------------------------------------------------------
  // Continuous animation / game‑tick loop
  // ---------------------------------------------------------------------------
  function animate(){
    requestAnimationFrame(animate);
    Telemetry.recordFrame();
    if(!vrState.isGameRunning||state.isPaused) return;

    // Map VR cursor to legacy (u,v) for gameLoop
    const cursorUv = vrState.cursorPoint.length()
      ? spherePosToUv(vrState.cursorPoint,SPHERE_RADIUS)
      : spherePosToUv(vrState.avatarPos,SPHERE_RADIUS);
    window.mousePosition = {x:cursorUv.u*canvas.width,y:cursorUv.v*canvas.height};
    gameTick(window.mousePosition.x,window.mousePosition.y);
    updateHud({
      score : state.score,
      hp    : state.player.health,
      maxHp : state.player.maxHealth,
      off   : state.offensiveInventory[0],
      def   : state.defensiveInventory[0],
      core  : state.player.equippedAberrationCore
    });

    // Move Nexus avatar toward cursor (Momentum)
    if(vrState.cursorPoint.length()){
      moveTowards(vrState.avatarPos, vrState.cursorPoint, state.player.speed, SPHERE_RADIUS);
    }
    nexusAvatar.object3D.position.copy(vrState.avatarPos);
    nexusAvatar.object3D.lookAt(0,0,0);
    const uvNow = spherePosToUv(vrState.avatarPos,SPHERE_RADIUS);
    state.player.x = uvNow.u*canvas.width;
    state.player.y = uvNow.v*canvas.height;

    // Begin port of enemy AI to 3-D: update enemy positions on the sphere
    updateEnemies3d(vrState.avatarPos, SPHERE_RADIUS, canvas.width, canvas.height);
    updateProjectiles3d(SPHERE_RADIUS, canvas.width, canvas.height);

    if(crosshair && crosshair.getAttribute('visible')){
      scaleCrosshair(crosshair.object3D.position);
    }
    // recenter prompt obsolete with fixed deck

    // Spawn / update 3‑D representations of all dynamic objects
    const activeIds=new Set();

    const projectileTypes=new Set(['nova_bullet','ricochet_projectile','seeking_shrapnel','helix_bolt','player_fragment']);

    function obtainProjectile(){
      const el=projectilePool.pop();
      if(el){
        el.innerHTML='';
        el.removeAttribute('geometry');
        el.removeAttribute('material');
        el.removeAttribute('enemy-hitbox');
        el.dataset.pool='projectile';
        return el;
      }
      const e=document.createElement('a-entity');
      e.dataset.pool='projectile';
      return e;
    }

    function obtainEnemy(){
      const el=enemyPool.pop();
      if(el){
        el.innerHTML='';
        el.removeAttribute('geometry');
        el.removeAttribute('material');
        el.removeAttribute('enemy-hitbox');
        el.dataset.pool='enemy';
        return el;
      }
      const e=document.createElement('a-entity');
      e.dataset.pool='enemy';
      return e;
    }

    function obtainEffect(){
      const el = effectPool.pop();
      if(el){
        el.innerHTML='';
        el.removeAttribute('geometry');
        el.removeAttribute('material');
        el.removeAttribute('enemy-hitbox');
        el.dataset.pool='effect';
        return el;
      }
      const e=document.createElement('a-entity');
      e.dataset.pool='effect';
      return e;
    }

    function obtainPickup(){
      const el = pickupPool.pop();
      if(el){
        el.innerHTML='';
        el.removeAttribute('geometry');
        el.removeAttribute('material');
        el.removeAttribute('enemy-hitbox');
        el.dataset.pool='pickup';
        return el;
      }
      const e=document.createElement('a-entity');
      e.dataset.pool='pickup';
      return e;
    }

    function releaseProjectile(el){
      el.innerHTML='';
      el.removeAttribute('geometry');
      el.removeAttribute('material');
      el.removeAttribute('enemy-hitbox');
      if(el.parentElement) el.parentElement.removeChild(el);
      projectilePool.push(el);
    }

    function releaseEnemy(el){
      el.innerHTML='';
      el.removeAttribute('geometry');
      el.removeAttribute('material');
      el.removeAttribute('enemy-hitbox');
      if(el._hitHandler){
        el.removeEventListener('hit-player', el._hitHandler);
        delete el._hitHandler;
      }
      if(el.parentElement) el.parentElement.removeChild(el);
      enemyPool.push(el);
    }

    function releaseEffect(el){
      el.innerHTML='';
      el.removeAttribute('geometry');
      el.removeAttribute('material');
      el.removeAttribute('enemy-hitbox');
      if(el.parentElement) el.parentElement.removeChild(el);
      effectPool.push(el);
    }

    function releasePickup(el){
      el.innerHTML='';
      el.removeAttribute('geometry');
      el.removeAttribute('material');
      el.removeAttribute('enemy-hitbox');
      if(el.parentElement) el.parentElement.removeChild(el);
      pickupPool.push(el);
    }
    const projectileEmojis={
      nova_bullet:'🔹',
      ricochet_projectile:'🔸',
      seeking_shrapnel:'🚀',
      helix_bolt:'💫',
      player_fragment:'✦'
    };
    const bossEmojis={
      splitter:'🔶',
      reflector:'🛡️',
      vampire:'🩸',
      gravity:'🌀',
      swarm:'🐝',
      mirror:'🪞',
      emp:'⚡',
      architect:'🏛️',
      aethel_and_umbra:'☯️'
    };

    function handleEnemyCollision(enemyObj){
      const baseDmg = enemyObj.boss ? (enemyObj.enraged ? 20 : 10) : 1;
      const scale   = enemyObj.boss ? BOSS_DAMAGE_MULTIPLIER : 1;
      const dmg = baseDmg * scale * state.player.talent_modifiers.damage_taken_multiplier;
      if(!state.player.shield && dmg > 0){
        state.player.health -= dmg;
        if(state.player.health <= 0) state.gameOver = true;
        AudioManager.playSfx('hitSound');
        if(window.pulseControllers) window.pulseControllers(80,0.8);
      }else if(state.player.shield && dmg > 0){
        state.player.shield = false;
        AudioManager.playSfx('shieldBreak');
        if(window.pulseControllers) window.pulseControllers(60,0.6);
      }
    }

    function spawn(obj, container){
      const id = obj.instanceId || `${obj.type||'obj'}-${obj.startTime||0}-${obj.x}`;
      activeIds.add(id);
      let el = entityMap.get(id);
      const pos = uvToSpherePos(obj.x/canvas.width, obj.y/canvas.height, SPHERE_RADIUS);
      if(!el){
        const isProj = projectileTypes.has(obj.type);
        const isEnemy = container===enemyContainer;
        const isPickup = container===pickupContainer;
        const isEffect = container===effectContainer || container===telegraphContainer;
        if(isProj) el = obtainProjectile();
        else if(isEnemy) el = obtainEnemy();
        else if(isPickup) el = obtainPickup();
        else if(isEffect) el = obtainEffect();
        else el = document.createElement('a-entity');
        entityMap.set(id,el);
        container.appendChild(el);
        if(obj.model){
          // Replace any custom models with a simple placeholder shape
          el.setAttribute('geometry','primitive: box; depth:0.3; height:0.3; width:0.3');
          el.setAttribute('material',`color:${obj.customColor||'#888'}; emissive:${obj.customColor||'#888'}; emissiveIntensity:0.5`);
        }else if(obj.boss){
          el.setAttribute('geometry','primitive: sphere; radius: 0.5');
          el.setAttribute('material',`color:${obj.color||'#e74c3c'}; emissive:${obj.color||'#e74c3c'}; emissiveIntensity:0.4`);
          const label=document.createElement('a-text');
          label.setAttribute('value',bossEmojis[obj.id]||'👾');
          label.setAttribute('align','center');
          label.setAttribute('width','0.8');
          label.setAttribute('color','#ffffff');
          label.object3D.position.set(0,0,0.35);
          el.appendChild(label);
        }else if(obj.emoji||obj.type==='rune_of_fate'){
          el.setAttribute('geometry','primitive: dodecahedron; radius:0.2');
          el.setAttribute('material',`color:${obj.emoji==='🩸'?'#800020':'#2ecc71'}; emissive:${obj.emoji==='🩸'?'#800020':'#2ecc71'}; emissiveIntensity:0.6`);
          const label=document.createElement('a-text');
          label.setAttribute('value',obj.type==='rune_of_fate'?'⭐':(obj.emoji||'❓'));
          label.setAttribute('align','center');
          label.setAttribute('width','0.5');
          label.setAttribute('color','#ffffff');
          label.object3D.position.set(0,0,0.25);
          el.appendChild(label);
        }else if(projectileTypes.has(obj.type)){
          el.setAttribute('geometry','primitive: sphere; radius:0.05');
          el.setAttribute('material',`color:${obj.customColor||'#ffffff'}; emissive:${obj.customColor||'#ffffff'}; emissiveIntensity:0.8`);
          const label=document.createElement('a-text');
          label.setAttribute('value',projectileEmojis[obj.type]||'•');
          label.setAttribute('align','center');
          label.setAttribute('width','0.3');
          label.setAttribute('color','#ffffff');
          label.object3D.position.set(0,0,0.1);
          el.appendChild(label);
        }else if(obj.type==="syphon_cone"){
          const deg=THREE.MathUtils.radToDeg(obj.coneAngle||Math.PI/4);
          el.setAttribute("geometry",`primitive: cylinder; radius:${SPHERE_RADIUS*0.6}; height:0.05; openEnded:true; thetaStart:-${deg}/2; thetaLength:${deg}`);
          el.setAttribute("material","color:#9b59b6; opacity:0.4; transparent:true; side:double");
        }else if(obj.type==="shrinking_box_warning"||obj.type==="shrinking_box"){
          const size = obj.size || (obj.initialSize*(1-((Date.now()-obj.startTime)/obj.duration)));
          const rad = size/2/canvas.width*SPHERE_RADIUS;
          el.setAttribute('geometry',`primitive: ring; radiusInner:${Math.max(rad-0.05,0.01)}; radiusOuter:${rad}`);
          el.setAttribute('material','color:#d35400; opacity:0.4; transparent:true; side:double');
        }else{
          el.setAttribute('geometry','primitive: sphere; radius:0.2');
          el.setAttribute('material',`color:${obj.customColor||'#c0392b'}; emissive:${obj.customColor||'#c0392b'}; emissiveIntensity:0.4`);
          const label=document.createElement('a-text');
          label.setAttribute('value','💀');
          label.setAttribute('align','center');
          label.setAttribute('width','0.5');
          label.setAttribute('color','#ffffff');
          label.object3D.position.set(0,0,0.25);
          el.appendChild(label);
        }
      }
        el.object3D.position.copy(pos);
        if(projectileTypes.has(obj.type)){
          const prev = previousPositions.get(id);
          if(prev){
            const dir = pos.clone().sub(prev).normalize();
            el.object3D.lookAt(pos.clone().add(dir));
          } else {
            el.object3D.lookAt(0,0,0);
          }
          previousPositions.set(id,pos.clone());
        } else {
          if(obj.type==="syphon_cone"){
            const normal=pos.clone().normalize();
            const quat=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
            el.object3D.quaternion.copy(quat);
            el.object3D.rotateOnAxis(normal,obj.angle||0);
          } else if(obj.type==="shrinking_box_warning"||obj.type==="shrinking_box"){
            const normal=pos.clone().normalize();
            const quat=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
            el.object3D.quaternion.copy(quat);
            el.object3D.lookAt(0,0,0);
          } else {
            el.object3D.lookAt(0,0,0);
          }
          previousPositions.set(id,pos.clone());
        }
      if(container===enemyContainer){
        const rad = (obj.r || 20) / canvas.width * SPHERE_RADIUS;
        el.setAttribute('enemy-hitbox', `radius:${rad}`);
        const listener = ()=>handleEnemyCollision(obj);
        el._hitHandler = listener;
        el.addEventListener('hit-player', listener);
      }
    }

    state.enemies.forEach(o=>spawn(o, enemyContainer));
    state.pickups.forEach(o=>spawn(o, pickupContainer));
    state.effects.forEach(o=>{
      const isTelegraph = o.type==="syphon_cone"||o.type==="shrinking_box_warning"||o.type==="shrinking_box";
      const cont = projectileTypes.has(o.type) ? projectileContainer : (isTelegraph ? telegraphContainer : effectContainer);
      spawn(o, cont);
    });

    // Remove entities that disappeared from game state
    for(const [id,el] of entityMap.entries()){
      if(!activeIds.has(id)){
        if(el.dataset.pool==='projectile') releaseProjectile(el);
        else if(el.dataset.pool==='enemy') releaseEnemy(el);
        else if(el.dataset.pool==='effect') releaseEffect(el);
        else if(el.dataset.pool==='pickup') releasePickup(el);
        else el.remove();
        entityMap.delete(id);
        previousPositions.delete(id);
      }
    }

    if(state.gameOver){
      showGameOverPanel();
    }
  }

  // ---------------------------------------------------------------------------
  // One‑time start‑up: set up deck, light, controllers, events, etc.
  // ---------------------------------------------------------------------------
  loadPlayerState();
  drawGrid(document.getElementById('gridCanvas'));
  drawButtonTexture(document.getElementById('buttonCanvas'));
  applySettings();

  const turnSpeedRange = document.getElementById('turnSpeedRange');
  const vignetteRange = document.getElementById('vignetteRange');
  const musicVolumeRange   = document.getElementById('musicVolumeRange');
  const sfxVolumeRange     = document.getElementById('sfxVolumeRange');
  const turnStyleSelect   = document.getElementById('turnStyleSelect');
  const telemetryToggle   = document.getElementById('telemetryToggle');
  const highContrastToggle = document.getElementById('highContrastToggle');

  safeAddEventListener(turnSpeedRange,'input',e=>{ userSettings.turnSpeed = parseFloat(e.target.value); saveSettings(); });
  safeAddEventListener(vignetteRange,'input',e=>{ userSettings.vignetteIntensity = parseFloat(e.target.value); applySettings(); saveSettings(); });
  safeAddEventListener(musicVolumeRange,'input',e=>{ userSettings.musicVolume = parseFloat(e.target.value); applySettings(); saveSettings(); });
  safeAddEventListener(sfxVolumeRange,'input',e=>{ userSettings.sfxVolume = parseFloat(e.target.value); applySettings(); saveSettings(); });
  safeAddEventListener(turnStyleSelect,'input',e=>{ userSettings.turnStyle = e.target.value; saveSettings(); });
  safeAddEventListener(telemetryToggle,'input',e=>{
    userSettings.telemetryEnabled = e.target.checked;
    saveSettings();
    if(userSettings.telemetryEnabled) Telemetry.start(storeTelemetry);
    else Telemetry.stop();
  });
  safeAddEventListener(highContrastToggle,'input',e=>{
    userSettings.highContrast = e.target.checked;
    applyHighContrastMode();
    saveSettings();
  });

  if(battleSphere){
    battleSphere.addEventListener('raycaster-intersection',e=>{
      const hit=e.detail.intersections[0];
      if(hit){
        vrState.cursorPoint.copy(hit.point);
        if(crosshair){
          crosshair.object3D.position.copy(hit.point);
          scaleCrosshair(hit.point);
          crosshair.setAttribute('visible', true);
        }
      }
    });
    battleSphere.addEventListener('raycaster-intersection-cleared',()=>{
      vrState.cursorPoint.set(0,0,0);
      if(crosshair){
        crosshair.setAttribute('visible', false);
      }
    });
  }

  function setupController(hand){
    let trigger=false;
    hand.addEventListener('triggerdown',()=>{
      trigger=true;
      if(tutorial.step===0) advanceTutorial();
      if(hand===leftHand) vrState.leftTriggerDown = true;
      else vrState.rightTriggerDown = true;

      const now = Date.now();
      if(vrState.leftTriggerDown && vrState.rightTriggerDown && now - vrState.lastCoreUse > 150){
        activateCorePower(window.mousePosition.x, window.mousePosition.y, window.gameHelpers);
        vrState.lastCoreUse = now;
        if(tutorial.step===3) advanceTutorial();
        return;
      }

      setTimeout(()=>{
        const otherDown = hand===leftHand ? vrState.rightTriggerDown : vrState.leftTriggerDown;
        if(trigger && !otherDown){
          const key=(hand===leftHand)?state.offensiveInventory[0]:state.defensiveInventory[0];
          if(key){
            usePower(key);
            if(tutorial.step===2) advanceTutorial();
          }
        }
      },150);
    });
    hand.addEventListener('triggerup',()=>{
      trigger=false;
      if(hand===leftHand) vrState.leftTriggerDown = false;
      else vrState.rightTriggerDown = false;
    });
  }
  if(leftHand) setupController(leftHand);
  if(rightHand) setupController(rightHand);

  function setupTurning(){
    const rig = document.getElementById('rig');
    let lastSnap = 0;
    [leftHand, rightHand].forEach(hand=>{
      if(!hand) return;
      hand.addEventListener('thumbstickmoved',e=>{
        if(!rig) return;
        const x = e.detail.x;
        if(userSettings.turnStyle === 'smooth'){
          if(Math.abs(x) > 0.2){
            rig.object3D.rotation.y -= x * userSettings.turnSpeed * 0.05;
          }
        }else if(userSettings.turnStyle === 'snap'){
          if(Math.abs(x) > 0.8){
            const now = Date.now();
            if(now - lastSnap > 250){
              rig.object3D.rotation.y -= Math.sign(x) * THREE.MathUtils.degToRad(30);
              lastSnap = now;
            }
          }
        }
      });
    });
  }
  setupTurning();

  function setupStageSelectPanel(){
    const prev=document.getElementById('prevStageBtn');
    const next=document.getElementById('nextStageBtn');
    const start=document.getElementById('startStageBtn');
    const close=document.getElementById('closeStageSelectBtn');
    safeAddEventListener(prev,'click',()=>{
      const max=state.player.highestStageBeaten+1;
      vrState.stageSelectIndex = vrState.stageSelectIndex>1 ? vrState.stageSelectIndex-1 : max;
      updateStageSelectDisplay();
    });
    safeAddEventListener(next,'click',()=>{
      const max=state.player.highestStageBeaten+1;
      vrState.stageSelectIndex = vrState.stageSelectIndex<max ? vrState.stageSelectIndex+1 : 1;
      updateStageSelectDisplay();
    });
    safeAddEventListener(start,'click',()=>{
      startSpecificLevel(vrState.stageSelectIndex);
    });
    safeAddEventListener(close,'click',()=>{
      holographicPanel.setAttribute('visible',false);
      vrState.holographicPanelVisible=false;
      vrState.stageSelectOpen=false;
      AudioManager.playSfx('uiModalClose');
    });
  }

  const onSceneLoaded = () => {
    anchorCommandDeck();
    createDeckFloor();
    // Legacy builder retained for reference but replaced by vrCommandCluster
    // createCommandCluster();
    buildVrHud(commandDeck);
    setupStageSelectPanel();
    AudioManager.setup(Array.from(document.querySelectorAll('.game-audio')), document.getElementById('soundOptionsToggle'));
    applySettings();
    updateUiScale();
  };
  if(sceneEl.hasLoaded) onSceneLoaded();
  else safeAddEventListener(sceneEl,'loaded', onSceneLoaded);
  safeAddEventListener(sceneEl,'enter-vr',()=>{
    anchorCommandDeck();
    showTutorialPrompt();
    updateUiScale();
    if(!vrState.isGameRunning){
      initialiseStage();
    }
  });
  safeAddEventListener(sceneEl,'exit-vr',()=>{
    vrState.isGameRunning = false;
    if(crosshair) crosshair.setAttribute('visible', false);
    if(holographicPanel) holographicPanel.setAttribute('visible', false);
  });

  window.addEventListener('keydown', e => {
    if(e.key === 'r' || e.key === 'R') recenterCommandDeck();
  });
  window.addEventListener('resize', updateUiScale);
  document.addEventListener('visibilitychange', () => AudioManager.handleVisibilityChange());

  if(userSettings.telemetryEnabled) Telemetry.start(storeTelemetry);
  animate();
});
