import { start as startVR } from './vrMain.js';
import { AssetManager } from './modules/AssetManager.js';

const loadingEl = document.getElementById('loadingScreen');
const fillEl = document.getElementById('loadingProgressFill');
const statusEl = document.getElementById('loadingStatusText');
const progressContainer = document.getElementById('loadingProgressContainer');

// A manifest of essential assets to load before the game starts.
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
        // Use a catch to prevent one failed asset from stopping the whole process
        return promise.then(() => updateProgress(url)).catch(err => {
            console.warn(`Could not load asset: ${url}`, err);
            updateProgress(url); // Still count it as "loaded" to not stall the bar
        });
    });

    await Promise.all(loadPromises);

    if (statusEl) statusEl.textContent = 'Momentum Stabilized!';
}

async function main() {
    // Show the initial prompt and hide the progress bar
    if (statusEl) statusEl.textContent = 'Click to Begin';
    if (progressContainer) progressContainer.style.display = 'none';

    // Wait for the first user interaction to unlock the AudioContext
    loadingEl.addEventListener('click', async () => {
        // Show the progress bar and start loading
        if (statusEl) statusEl.textContent = 'Initializing Systems...';
        if (progressContainer) progressContainer.style.display = 'block';

        try {
            await preloadAssets();
            
            // Fade out the loading screen
            if (loadingEl) loadingEl.style.opacity = '0';
            
            // Start the VR setup after the fade-out animation
            setTimeout(() => {
                if (loadingEl) loadingEl.style.display = 'none';
                startVR(); 
            }, 500);

        } catch (error) {
            console.error("Fatal error during initialization:", error);
            if (statusEl) statusEl.textContent = "Error: Could not load critical assets.";
        }
    }, { once: true }); // The listener will only fire once
}

window.addEventListener('load', main);
