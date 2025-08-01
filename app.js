import { start as startVR } from './vrMain.js';
import { AssetManager } from './modules/AssetManager.js';

const loadingEl = document.getElementById('loadingScreen');
const fillEl = document.getElementById('loadingProgressFill');
const statusEl = document.getElementById('loadingStatusText');

// MANIFEST HAS BEEN MODIFIED to only load visual assets. Audio is loaded in vrMain.js.
const ASSET_MANIFEST = [
    // Textures
    'assets/bg.png',
    'assets/cursors/crosshair.cur',
    'assets/load.png',
];

async function preloadAssets() {
    const assetManager = new AssetManager();
    const totalAssets = ASSET_MANIFEST.length;
    let loadedCount = 0;

    const updateProgress = (url) => {
        loadedCount++;
        const progress = Math.round((loadedCount / totalAssets) * 100);
        if (fillEl) fillEl.style.width = `${progress}%`;
        if (statusEl) statusEl.textContent = `Loading Visuals... (${progress}%)`;
    };

    if (totalAssets === 0) {
        updateProgress();
        return;
    }

    const loadPromises = ASSET_MANIFEST.map(url => {
        return assetManager.loadTexture(url).then(() => updateProgress(url)).catch(err => {
            console.warn(`Could not load asset: ${url}`, err);
            updateProgress(url);
        });
    });

    await Promise.all(loadPromises);
    if (statusEl) statusEl.textContent = 'Visuals Loaded!';
}

async function main() {
    try {
        await preloadAssets();
        
        if (loadingEl) loadingEl.style.opacity = '0';
        
        setTimeout(() => {
            if (loadingEl) loadingEl.style.display = 'none';
            startVR(); 
        }, 500);

    } catch (error) {
        console.error("Fatal error during initialization:", error);
        if (statusEl) statusEl.textContent = "Error: Could not load critical assets.";
    }
}

window.addEventListener('load', main);
