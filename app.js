import { launchVR } from './vrMain.js';
import { AssetManager } from './modules/AssetManager.js';
import { state, loadPlayerState, savePlayerState } from './modules/state.js';
import { applyAllTalentEffects } from './modules/ascension.js';
import { AudioManager } from './modules/audio.js';

const loadingEl = document.getElementById('loadingScreen');
const fillEl = document.getElementById('loadingProgressFill');
const statusEl = document.getElementById('loadingStatusText');
const homeScreen = document.getElementById('homeScreen');

const ASSET_MANIFEST = [
    // Add ALL your assets here, including audio.
    // Textures
    'assets/bg.png', 'assets/cursors/crosshair.cur', 'assets/load.png',
    // Audio
    'assets/bgMusic_01.mp3', 'assets/bossSpawnSound.mp3', 'assets/hitSound.mp3',
    'assets/pickupSound.mp3', 'assets/uiClickSound.mp3', 'assets/uiHoverSound.mp3',
    'assets/shieldBreak.mp3', 'assets/shockwaveSound.mp3', 'assets/talentPurchase.mp3',
    'assets/talentError.mp3', 'assets/bossDefeatSound.mp3', 'assets/systemErrorSound.mp3', 'assets/finalBossPhaseSound.mp3'
];

async function preloadAssets() {
    // This function will now only be called after a user click.
    const assetManager = new AssetManager();
    const totalAssets = ASSET_MANIFEST.length;
    let loadedCount = 0;

    const updateProgress = (url) => {
        loadedCount++;
        const progress = Math.round((loadedCount / totalAssets) * 100);
        if (fillEl) fillEl.style.width = `${progress}%`;
        if (statusEl) statusEl.textContent = `Loading... (${progress}%)`;
    };

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
}

function setupHomeScreen() {
    const newGameBtn = document.getElementById('new-game-btn');
    const continueGameBtn = document.getElementById('continue-game-btn');
    const eraseGameBtn = document.getElementById('erase-game-btn');

    const hasSaveData = !!localStorage.getItem('eternalMomentumSave');
    
    if (hasSaveData) {
        continueGameBtn.style.display = 'block';
        eraseGameBtn.style.display = 'block';
        newGameBtn.style.display = 'none';
    } else {
        continueGameBtn.style.display = 'none';
        eraseGameBtn.style.display = 'none';
        newGameBtn.style.display = 'block';
    }

    const startVRSequence = (stage) => {
        AudioManager.unlockAudio(); // Unlock audio context on click
        homeScreen.style.display = 'none';
        loadingEl.style.display = 'none';
        launchVR(stage);
    };

    newGameBtn.addEventListener('click', () => startVRSequence(1));
    continueGameBtn.addEventListener('click', () => {
        const startStage = state.player.highestStageBeaten > 0 ? state.player.highestStageBeaten + 1 : 1;
        startVRSequence(startStage);
    });
    eraseGameBtn.addEventListener('click', () => {
        if (confirm("This timeline will be erased. All progress will be lost. This action cannot be undone.")) {
            localStorage.removeItem('eternalMomentumSave');
            window.location.reload();
        }
    });
}

async function main() {
    // Show the initial loading screen and prompt
    if (statusEl) statusEl.textContent = 'Click to Load Experience';
    if (fillEl) fillEl.parentElement.style.display = 'none';

    loadingEl.addEventListener('click', async () => {
        if (statusEl) statusEl.textContent = 'Loading Assets...';
        if (fillEl) fillEl.parentElement.style.display = 'block';
        
        await preloadAssets();
        
        loadPlayerState();
        applyAllTalentEffects();
        setupHomeScreen();

        loadingEl.style.opacity = '0';
        setTimeout(() => {
            loadingEl.style.display = 'none';
            homeScreen.style.display = 'flex';
        }, 500);

    }, { once: true });
}

window.addEventListener('load', main);
