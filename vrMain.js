import * as THREE from './vendor/three.module.js';
import { VRButton } from './vendor/addons/webxr/VRButton.js';
import { initScene, getScene, getRenderer, getCamera } from './modules/scene.js';
import { initPlayerController, updatePlayerController } from './modules/PlayerController.js';
import { initUI, updateHud, showHud } from './modules/UIManager.js';
import { initModals, showHomeMenu } from './modules/ModalManager.js';
import { vrGameLoop } from './modules/vrGameLoop.js';
import { Telemetry } from './modules/telemetry.js';
import { state, loadPlayerState, applyAllTalentEffects, resetGame } from './modules/state.js';
import { AudioManager } from './modules/audio.js';

let renderer;
export let vrMainRunning = false;
export const isRunning = () => vrMainRunning;
let vrSessionJustStarted = false; // Flag to initialize on the first frame

function render(timestamp, frame) {
    // --- FIX START ---
    // Check if the VR session just began and run initialization logic
    if (vrSessionJustStarted) {
        showHud();
        if (!vrMainRunning) {
            window.startGame();
        }
        vrSessionJustStarted = false; // Reset the flag so this only runs once
    }
    // --- FIX END ---

    if (!frame) return; // Don't run logic if not in a session

    Telemetry.recordFrame();
    updatePlayerController();
    
    // Only run the main game logic if not paused
    if (!state.isPaused) {
        vrGameLoop();
    }
    
    updateHud();
    renderer.render(getScene(), getCamera());
}

export function startGame(isNewGame = false, initialStage = 1) {
    resetGame();
    if (!isNewGame) {
        state.currentStage = Math.max(1, state.player.highestStageBeaten + 1);
    } else {
        state.currentStage = initialStage;
    }
    state.isPaused = true;
    showHomeMenu();
    vrMainRunning = true;
}
window.startGame = startGame; // Exposed globally for session handler

export function stopGame() {
    vrMainRunning = false;
    state.isPaused = true;
    state.gameOver = false;
    // You might want to hide HUD elements here as well
}

export function start() {
    initScene();
    renderer = getRenderer();
    document.getElementById('vrContainer').appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    renderer.xr.enabled = true;

    loadPlayerState();
    applyAllTalentEffects(); // Apply talents after loading state

    initPlayerController();
    initUI();
    initModals();
    AudioManager.setup(getCamera());

    renderer.xr.addEventListener('sessionstart', () => {
        vrSessionJustStarted = true; // Set the flag instead of calling startGame directly
        AudioManager.unlockAudio();
    });

    renderer.setAnimationLoop(render);
}
