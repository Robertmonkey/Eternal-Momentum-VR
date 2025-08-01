import { start as startVR } from './vrMain.js';
import { AssetManager } from './modules/AssetManager.js';

const loadingEl = document.getElementById('loadingScreen');
const fillEl = document.getElementById('loadingProgressFill');
const statusEl = document.getElementById('loadingStatusText');

// A manifest of essential assets to load before the game starts.
// You should add all critical audio files here to avoid in-game loading hitches.
const ASSET_MANIFEST = [
    // Textures
    'assets/bg.png',
    'assets/cursors/crosshair.cur',
    // Audio
    'assets/bgMusic_01.mp3',
    'assets/bossSpawnSound.mp3',
    'assets/hitSound.mp3',
    'assets/pickupSound.mp3',
    'assets/uiClickSound.mp3',
    'assets/uiHoverSound.mp3',
    'assets/shieldBreak.mp3',
    'assets/shockwaveSound.mp3',
    'assets/talentPurchase.mp3',
    'assets/talentError.mp3',
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

    const loadPromises = ASSET_MANIFEST.map(url => {
        let promise;
        if (/\.(mp3|wav|ogg)$/.test(url)) {
            promise = assetManager.loadAudio(url);
        } else {
            promise = assetManager.loadTexture(url);
        }
        return promise.then(() => updateProgress(url));
    });

    await Promise.all(loadPromises);

    if (statusEl) statusEl.textContent = 'Momentum Stabilized!';
}

async function main() {
    try {
        await preloadAssets();
        
        // Fade out the loading screen
        if (loadingEl) loadingEl.style.opacity = '0';
        
        // Start VR after the fade-out
        setTimeout(() => {
            if (loadingEl) loadingEl.style.display = 'none';
            // This will start the VR session and show the in-VR home menu.
            startVR(); 
        }, 500);

    } catch (error) {
        console.error("Fatal error during initialization:", error);
        if (statusEl) statusEl.textContent = "Error: Could not load critical assets.";
    }
}

window.addEventListener('load', main);
