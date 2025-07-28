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
import { populateAberrationCoreMenu, populateOrreryMenu, showBossInfo } from './modules/ui.js';
import { uvToSpherePos, spherePosToUv } from './modules/utils.js';
import { moveTowards } from './modules/movement3d.js';
import { AudioManager } from './modules/audio.js';
import { STAGE_CONFIG } from './modules/config.js';

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
  tick() { if (this.texture) this.texture.needsUpdate = true; }
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
  const holographicPanel = document.getElementById('holographicPanel');
  const closeHoloBtn     = document.getElementById('closeHolographicPanelBtn');
  const leftHand  = document.getElementById('leftHand');
  const rightHand = document.getElementById('rightHand');

  const SPHERE_RADIUS = 8;
  const entityMap = new Map();  // maps game objects → A‑Frame entities

  // --- VR‑only runtime state ---------------------------------------------------
  const vrState = {
    cursorPoint: new THREE.Vector3(),
    avatarPos:  new THREE.Vector3(),
    isGameRunning: false,
    holographicPanelVisible: false,
    lastCoreUse: -Infinity,
    leftTriggerDown: false,
    rightTriggerDown: false
  };

  // ---------------------------------------------------------------------------
  // Helper: anchor the command deck to the camera at waist height and ensure
  // it rotates only with the player's yaw. Called on scene load and on every
  // frame to keep orientation stable even if the player tilts their head.
  // ---------------------------------------------------------------------------
  function anchorCommandDeck() {
    if (cameraEl && commandDeck.parentElement !== cameraEl) {
      cameraEl.appendChild(commandDeck);
      commandDeck.object3D.position.set(0, -0.6, 0); // waist level
    }
    const rot = cameraEl.object3D.rotation;
    commandDeck.object3D.rotation.set(-rot.x, 0, -rot.z);
  }

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
          restartCurrentStage();
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
    restartCurrentStage();
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

  // ---------------------------------------------------------------------------
  // Helper: build the command‑cluster deck & buttons programmatically.
  // ---------------------------------------------------------------------------
  function createCommandCluster(){
    if (commandDeck.children.length) return; // already built

    // Deck floor – uses gridCanvas for emissive glow
    const deckFloor = document.createElement('a-circle');
    deckFloor.setAttribute('id','deckFloor');
    deckFloor.setAttribute('radius',2);
    deckFloor.setAttribute('rotation','-90 0 0');
    deckFloor.setAttribute('material','transparent:true; opacity:0.6; side:double');
    deckFloor.setAttribute('canvas-texture','#gridCanvas');
    commandDeck.appendChild(deckFloor);

    // Functional console buttons
    const buttons = {
      ascension:{angle:-40, r:1.2,  y:0.30, emoji:"🜂", action:openAscensionPanel},
      cores:    {angle:-10, r:1.25, y:0.25, emoji:"⭐", action:openCorePanel},
      orrery:   {angle: 20, r:1.25, y:0.20, emoji:"🪐", action:openOrreryPanel},
      resume:   {angle: 50, r:1.30, y:0.15, emoji:"▶",  action:()=>vrState.isGameRunning=true},
      sound:    {angle: 80, r:1.30, y:0.10, emoji:"🔊", action:()=>AudioManager.toggleMute()}
    };

    Object.entries(buttons).forEach(([id,cfg])=>{
      const btn=document.createElement('a-entity');
      btn.setAttribute('id',id); btn.setAttribute('mixin','console-button');
      btn.classList.add('interactive');
      const ang=THREE.MathUtils.degToRad(cfg.angle);
      btn.object3D.position.set(Math.sin(ang)*cfg.r,cfg.y,-Math.cos(ang)*cfg.r);
      btn.object3D.lookAt(new THREE.Vector3(0,cfg.y,0));
      const idAttr = id==='sound' ? 'id="soundOptionsToggle"' : '';
      btn.innerHTML=`<a-text ${idAttr} value="${cfg.emoji}" align="center" width="1" color="#eaf2ff" position="0 0.01 0.06"></a-text>`;
      btn.addEventListener('mouseenter',()=>AudioManager.playSfx('uiHoverSound'));
      btn.addEventListener('click',async ()=>{
        AudioManager.playSfx('uiClickSound');
        if(cfg.action) await cfg.action();
      });
      commandDeck.appendChild(btn);
    });
  }

  // ---------------------------------------------------------------------------
  // Render a DOM modal to a canvas then apply it to the holographic plane.
  // ---------------------------------------------------------------------------
  async function showHolographicPanel(modalSel, canvasSel){
    if(vrState.holographicPanelVisible) return;
    const modal=document.querySelector(modalSel);
    if(!modal) return;
    let target=document.querySelector(canvasSel);
    if(!target){
      target=document.createElement('canvas');
      target.id=canvasSel.substring(1);
      document.body.appendChild(target).style.display='none';
    }
    modal.classList.add('is-rendering');
    await html2canvas(modal,{backgroundColor:null,canvas:target,width:1280,height:960});
    modal.classList.remove('is-rendering');
    holographicPanel.setAttribute('canvas-texture',canvasSel);
    holographicPanel.setAttribute('visible',true);
    vrState.holographicPanelVisible=true;
    AudioManager.playSfx('uiModalOpen');
  }
  if(closeHoloBtn){
    closeHoloBtn.addEventListener('click',()=>{
      holographicPanel.setAttribute('visible',false);
      vrState.holographicPanelVisible=false;
      AudioManager.playSfx('uiModalClose');
    });
  }

  // ---------------------------------------------------------------------------
  // Restart (or start) the current stage – called on scene load & on respawn.
  // ---------------------------------------------------------------------------
  function restartCurrentStage(){
    for(const e of entityMap.values()) e.remove();
    entityMap.clear();
    resetGame(state.arenaMode);
    applyAllTalentEffects();
    vrState.avatarPos.set(0,SPHERE_RADIUS,0);
    const uv = spherePosToUv(vrState.avatarPos, SPHERE_RADIUS);
    state.player.x = uv.u*canvas.width;
    state.player.y = uv.v*canvas.height;
    if(!state.currentStage||state.currentStage<1||state.currentStage>STAGE_CONFIG.length) state.currentStage=1;
    spawnBossesForStage(state.currentStage);
    vrState.isGameRunning = true;
  }

  // ---------------------------------------------------------------------------
  // Continuous animation / game‑tick loop
  // ---------------------------------------------------------------------------
  function animate(){
    requestAnimationFrame(animate);
    anchorCommandDeck();
    if(!vrState.isGameRunning||state.isPaused) return;

    // Map VR cursor to legacy (u,v) for gameLoop
    const cursorUv = vrState.cursorPoint.length()
      ? spherePosToUv(vrState.cursorPoint,SPHERE_RADIUS)
      : spherePosToUv(vrState.avatarPos,SPHERE_RADIUS);
    window.mousePosition = {x:cursorUv.u*canvas.width,y:cursorUv.v*canvas.height};
    gameTick(window.mousePosition.x,window.mousePosition.y);

    // Move Nexus avatar toward cursor (Momentum)
    if(vrState.cursorPoint.length()){
      moveTowards(vrState.avatarPos, vrState.cursorPoint, state.player.speed, SPHERE_RADIUS);
      nexusAvatar.object3D.position.copy(vrState.avatarPos);
      nexusAvatar.object3D.lookAt(0,0,0);
      const uvNow = spherePosToUv(vrState.avatarPos,SPHERE_RADIUS);
      state.player.x = uvNow.u*canvas.width;
      state.player.y = uvNow.v*canvas.height;
    }

    // Spawn / update 3‑D representations of all dynamic objects
    const activeIds=new Set();

    const projectileTypes=new Set(['nova_bullet','ricochet_projectile','seeking_shrapnel','helix_bolt','player_fragment']);

    function spawn(obj, container){
      const id = obj.instanceId || `${obj.type||'obj'}-${obj.startTime||0}-${obj.x}`;
      activeIds.add(id);
      let el = entityMap.get(id);
      const pos = uvToSpherePos(obj.x/canvas.width, obj.y/canvas.height, SPHERE_RADIUS);
      if(!el){
        el=document.createElement('a-entity');
        entityMap.set(id,el);
        container.appendChild(el);
        if(obj.boss){
          el.setAttribute('geometry','primitive: sphere; radius: 0.5');
          el.setAttribute('material',`color:${obj.color||'#e74c3c'}; emissive:${obj.color||'#e74c3c'}; emissiveIntensity:0.4`);
        }else if(obj.emoji||obj.type==='rune_of_fate'){
          el.setAttribute('geometry','primitive: dodecahedron; radius:0.2');
          el.setAttribute('material',`color:${obj.emoji==='🩸'?'#800020':'#2ecc71'}; emissive:${obj.emoji==='🩸'?'#800020':'#2ecc71'}; emissiveIntensity:0.6`);
        }else if(projectileTypes.has(obj.type)){
          el.setAttribute('geometry','primitive: sphere; radius:0.05');
          el.setAttribute('material',`color:${obj.customColor||'#ffffff'}; emissive:${obj.customColor||'#ffffff'}; emissiveIntensity:0.8`);
        }else{
          el.setAttribute('geometry','primitive: sphere; radius:0.2');
          el.setAttribute('material',`color:${obj.customColor||'#c0392b'}; emissive:${obj.customColor||'#c0392b'}; emissiveIntensity:0.4`);
        }
      }
      el.object3D.position.copy(pos);
      el.object3D.lookAt(0,0,0);
    }

    state.enemies.forEach(o=>spawn(o, enemyContainer));
    state.pickups.forEach(o=>spawn(o, pickupContainer));
    state.effects.forEach(o=>spawn(o, projectileTypes.has(o.type)?projectileContainer:effectContainer));
    state.decoys.forEach(o=>spawn(o, effectContainer));

    // Remove entities that disappeared from game state
    for(const [id,el] of entityMap.entries()){
      if(!activeIds.has(id)){ el.remove(); entityMap.delete(id); }
    }
  }

  // ---------------------------------------------------------------------------
  // One‑time start‑up: set up deck, light, controllers, events, etc.
  // ---------------------------------------------------------------------------
  loadPlayerState();
  drawGrid(document.getElementById('gridCanvas'));

  if(battleSphere){
    battleSphere.addEventListener('raycaster-intersection',e=>{
      const hit=e.detail.intersections[0];
      if(hit) vrState.cursorPoint.copy(hit.point);
    });
    battleSphere.addEventListener('raycaster-intersection-cleared',()=>vrState.cursorPoint.set(0,0,0));
  }

  function setupController(hand){
    let trigger=false;
    hand.addEventListener('triggerdown',()=>{
      trigger=true;
      if(hand===leftHand) vrState.leftTriggerDown = true;
      else vrState.rightTriggerDown = true;

      const now = Date.now();
      if(vrState.leftTriggerDown && vrState.rightTriggerDown && now - vrState.lastCoreUse > 150){
        activateCorePower(window.mousePosition.x, window.mousePosition.y, window.gameHelpers);
        vrState.lastCoreUse = now;
        return;
      }

      setTimeout(()=>{
        const otherDown = hand===leftHand ? vrState.rightTriggerDown : vrState.leftTriggerDown;
        if(trigger && !otherDown){
          const key=(hand===leftHand)?state.offensiveInventory[0]:state.defensiveInventory[0];
          if(key) usePower(key);
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

  if(sceneEl){
    sceneEl.addEventListener('loaded', ()=>{
      anchorCommandDeck();
      createCommandCluster();
      AudioManager.setup(Array.from(document.querySelectorAll('.game-audio')),document.getElementById('soundOptionsToggle'));
    });
    sceneEl.addEventListener('enter-vr',()=>{
      anchorCommandDeck();
      restartCurrentStage();
    });
  }

  animate();
});
