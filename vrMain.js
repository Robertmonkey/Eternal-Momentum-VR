import * as THREE from './vendor/three.module.js';
import { VRButton } from './vendor/addons/webxr/VRButton.js';
import { initScene, getScene, getRenderer, getCamera } from './modules/scene.js';
import { initPlayerController, updatePlayerController } from './modules/PlayerController.js';
import { initUI, updateHud, showHud } from './modules/UIManager.js';
import { initModals, showHomeMenu, hideModal } from './modules/ModalManager.js';
import { vrGameLoop } from './modules/vrGameLoop.js';
import { Telemetry } from './modules/telemetry.js';
import { state, loadPlayerState, resetGame } from './modules/state.js';
import { applyAllTalentEffects } from './modules/ascension.js';
import { AudioManager } from './modules/audio.js';
import { AssetManager } from './modules/AssetManager.js';

let renderer;
export let vrMainRunning = false;
export const isRunning = () => vrMainRunning;

const AUDIO_ASSET_MANIFEST = [
    'assets/bgMusic_01.mp3', 'assets/bgMusic_02.mp3', 'assets/bgMusic_03.mp3', 'assets/bgMusic_04.mp3', 'assets/bgMusic_05.mp3',
    'assets/bossSpawnSound.mp3', 'assets/hitSound.mp3', 'assets/pickupSound.mp3', 'assets/uiClickSound.mp3',
    'assets/uiHoverSound.mp3', 'assets/shieldBreak.mp3', 'assets/shockwaveSound.mp3', 'assets/talentPurchase.mp3',
    'assets/talentError.mp3', 'assets/bossDefeatSound.mp3', 'assets/systemErrorSound.mp3', 'assets/finalBossPhaseSound.mp3'
    // Add other audio files here as needed
];

function render(timestamp, frame) {
    if (!frame) return;

    Telemetry.recordFrame();
    updatePlayerController();
    
    if (!state.isPaused) {
        vrGameLoop();
    }
    
    updateHud();
    renderer.render(getScene(), getCamera());
}

export function startGame(isNewGame = false) {
    // This is now only called from the in-VR home menu buttons
    resetGame();
    if (!isNewGame && state.player.highestStageBeaten > 0) {
        state.currentStage = state.player.highestStageBeaten + 1;
    } else {
        state.currentStage = 1;
    }
    
    hideModal(); // Hide the home menu
    state.isPaused = false; // Start the gameplay loop
}
// Expose to window so the in-VR home menu buttons can call it
window.startGame = startGame;

export function stopGame() {
    vrMainRunning = false;
    state.isPaused = true;
    state.gameOver = false;
    showHomeMenu(); // Show the home menu when stopping the game
}

async function loadAudioAssets() {
    console.log("Unlocking audio and loading sound assets...");
    const assetManager = new AssetManager();
    const loadPromises = AUDIO_ASSET_MANIFEST.map(url => 
        assetManager.loadAudio(url).catch(err => console.warn(`Failed to load audio: ${url}`, err))
    );
    await Promise.all(loadPromises);
    console.log("Audio assets loaded.");
}

export async function start() {
    initScene();
    renderer = getRenderer();
    document.getElementById('vrContainer').appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    renderer.xr.enabled = true;

    loadPlayerState();
    applyAllTalentEffects();

    // Make sure async initializations are awaited
    await initPlayerController();
    initUI();
    initModals();
    AudioManager.setup(getCamera());

    renderer.xr.addEventListener('sessionstart', async () => {
        AudioManager.unlockAudio(); // This starts the music and allows sounds to play
        
        // Load audio in the background while showing the home menu
        loadAudioAssets(); 

        showHud();
        showHomeMenu(); // Show the main menu immediately
        state.isPaused = true;
        vrMainRunning = true;
    });

    renderer.setAnimationLoop(render);
}
