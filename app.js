import { launchVR } from './vrMain.js';
import { AssetManager } from './modules/AssetManager.js';
import { state, loadPlayerState, applyAllTalentEffects } from './modules/state.js';
import { AudioManager } from './modules/audio.js'; // We need this to unlock audio

// DOM Elements
const loadingEl = document.getElementById('loadingScreen');
const fillEl = document.getElementById('loadingProgressFill');
const statusEl = document.getElementById('loadingStatusText');
const homeScreen = document.getElementById('homeScreen');

// A full asset manifest. This time it's safe to load everything.
const ASSET_MANIFEST = [
    'assets/bg.png', 'assets/cursors/crosshair.cur', 'assets/load.png',
    'assets/home.mp4', // Required for home screen background
    'assets/bgMusic_01.mp3', 'assets/bossSpawnSound.mp3', 'assets/hitSound.mp3',
    'assets/pickupSound.mp3', 'assets/uiClickSound.mp3', 'assets/uiHoverSound.mp3',
    'assets/shieldBreak.mp3', 'assets/shockwaveSound.mp3', 'assets/talentPurchase.mp3',
    'assets/talentError.mp3', 'assets/bossDefeatSound.mp3', 'assets/systemErrorSound.mp3'
];

async function preloadAssets() {
    const assetManager = new AssetManager();
    const totalAssets = ASSET_MANIFEST.length;
    let loadedCount = 0;

    const updateProgress = (url) => {
        loadedCount++;
        const progress = Math.round((loadedCount / totalAssets) * 100);
        if (fillEl) fillEl.style.width = `${progress}%`;
        if (statusEl) statusEl.textContent = `Loading... (${progress}%)`;
    };

    // We can load everything now because the audio context will be unlocked later on click.
    const loadPromises = ASSET_MANIFEST.map(url => {
        let promise;
        if (/\.(mp3|wav|ogg)$/.test(url)) {
            promise = assetManager.loadAudio(url);
        } else {
            promise = assetManager.loadTexture(url);
        }
        return promise.then(() => updateProgress(url)).catch(err => {
            console.warn(`Could not load asset: ${url}`, err);
            updateProgress(url);
        });
    });

    await Promise.all(loadPromises);
    if (statusEl) statusEl.textContent = 'Momentum Stabilized!';
}

function setupHomeScreen() {
    const newGameBtn = document.getElementById('new-game-btn');
    const continueGameBtn = document.getElementById('continue-game-btn');
    const eraseGameBtn = document.getElementById('erase-game-btn');

    const hasSaveData = !!localStorage.getItem('eternalMomentumSave');
    
    if (hasSaveData) {
        continueGameBtn.style.display = 'block';
        eraseGameBtn.style.display = 'block';
    } else {
        newGameBtn.style.display = 'block';
    }

    const startVRSequence = (stage) => {
        AudioManager.unlockAudio(); // Unlock audio now that the user has clicked!
        homeScreen.style.display = 'none';
        launchVR(stage);
    };

    newGameBtn.addEventListener('click', () => startVRSequence(1));
    continueGameBtn.addEventListener('click', () => {
        const startStage = state.player.highestStageBeaten > 0 ? state.player.highestStageBeaten + 1 : 1;
        startVRSequence(startStage);
    });
    eraseGameBtn.addEventListener('click', () => {
        if (confirm("This timeline will be erased. All progress will be lost.")) {
            localStorage.removeItem('eternalMomentumSave');
            window.location.reload();
        }
    });
}

async function main() {
    try {
        await preloadAssets();
        
        loadPlayerState();
        applyAllTalentEffects();
        setupHomeScreen();

        if (loadingEl) loadingEl.style.opacity = '0';
        setTimeout(() => {
            if (loadingEl) loadingEl.style.display = 'none';
            if (homeScreen) homeScreen.style.display = 'flex';
        }, 500);

    } catch (error) {
        console.error("Fatal error during initialization:", error);
        if (statusEl) statusEl.textContent = "Error: Could not load critical assets.";
    }
}

window.addEventListener('load', main);
