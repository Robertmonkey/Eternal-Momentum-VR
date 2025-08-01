import * as THREE from './vendor/three.module.js';
import { VRButton } from './vendor/addons/webxr/VRButton.js';
import { initScene, getScene, getRenderer, getCamera } from './modules/scene.js';
import { initPlayerController, updatePlayerController } from './modules/PlayerController.js';
import { initUI, updateHud, showHud, updateTextSprite } from './modules/UIManager.js';
import { initModals, showHomeMenu, hideModal, getModalByName } from './modules/ModalManager.js';
import { vrGameLoop } from './modules/vrGameLoop.js';
import { Telemetry } from './modules/telemetry.js';
import { state, loadPlayerState, resetGame } from './modules/state.js';
import { applyAllTalentEffects } from './modules/ascension.js'; // <-- CORRECTED IMPORT
import { AudioManager } from './modules/audio.js';
import { AssetManager } from './modules/AssetManager.js';

let renderer;
export let vrMainRunning = false;
export const isRunning = () => vrMainRunning;
let vrSessionJustStarted = false;

// The full asset list is now defined here
const ASSET_MANIFEST = [
    'assets/bg.png', 'assets/cursors/crosshair.cur', 'assets/bgMusic_01.mp3',
    'assets/bossSpawnSound.mp3', 'assets/hitSound.mp3', 'assets/pickupSound.mp3',
    'assets/uiClickSound.mp3', 'assets/uiHoverSound.mp3', 'assets/shieldBreak.mp3',
    'assets/shockwaveSound.mp3', 'assets/talentPurchase.mp3', 'assets/talentError.mp3'
    // Add any other crucial assets here
];

async function loadAllGameAssets() {
    const assetManager = new AssetManager();
    const totalAssets = ASSET_MANIFEST.length;
    let loadedCount = 0;

    const homeModal = getModalByName('home');
    const titleSprite = homeModal?.userData.titleSprite;

    const updateProgress = () => {
        loadedCount++;
        const progress = Math.round((loadedCount / totalAssets) * 100);
        if (titleSprite) {
            updateTextSprite(titleSprite, `Loading... ${progress}%`);
        }
    };

    const loadPromises = ASSET_MANIFEST.map(url => {
        let promise;
        if (/\.(mp3|wav|ogg)$/.test(url)) {
            promise = assetManager.loadAudio(url);
        } else {
            promise = assetManager.loadTexture(url);
        }
        return promise.then(() => updateProgress()).catch(err => {
            console.warn(`Could not load asset: ${url}`, err);
            updateProgress();
        });
    });

    await Promise.all(loadPromises);
    if (titleSprite) {
        updateTextSprite(titleSprite, 'Momentum Stabilized!');
    }
}

function render(timestamp, frame) {
    if (vrSessionJustStarted) {
        showHud();
        if (!vrMainRunning) {
            window.startGame(false); // Show the home menu
        }
        vrSessionJustStarted = false;
    }

    if (!frame) return;

    Telemetry.recordFrame();
    updatePlayerController();
    
    if (!state.isPaused) {
        vrGameLoop();
    }
    
    updateHud();
    renderer.render(getScene(), getCamera());
}

export async function startGame(isNewGame = false, initialStage = 1) {
    // If the game isn't running, this is the first call from the session start. Just show the home menu.
    if (!vrMainRunning) {
        state.isPaused = true;
        showHomeMenu();
        vrMainRunning = true;
        return;
    }

    // If the game is already running, a button on the home menu was clicked. Time to load and play.
    const homeModal = getModalByName('home');
    if (homeModal) {
        // Disable buttons and show loading text
        homeModal.children.forEach(child => {
            if (child.name.startsWith('button_')) child.visible = false;
        });
        if (homeModal.userData.titleSprite) {
            updateTextSprite(homeModal.userData.titleSprite, 'Loading... 0%');
        }
    }

    await loadAllGameAssets();

    resetGame();
    if (!isNewGame) {
        state.currentStage = Math.max(1, state.player.highestStageBeaten + 1);
    } else {
        state.currentStage = initialStage;
    }

    hideModal();
    state.isPaused = false;
}
window.startGame = startGame;

export function stopGame() {
    vrMainRunning = false;
    state.isPaused = true;
    state.gameOver = false;
}

export function start() {
    initScene();
    renderer = getRenderer();
    document.getElementById('vrContainer').appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    renderer.xr.enabled = true;

    loadPlayerState();
    applyAllTalentEffects();

    initPlayerController();
    initUI();
    initModals();
    AudioManager.setup(getCamera());

    renderer.xr.addEventListener('sessionstart', () => {
        vrSessionJustStarted = true;
        AudioManager.unlockAudio();
    });

    renderer.setAnimationLoop(render);
}
