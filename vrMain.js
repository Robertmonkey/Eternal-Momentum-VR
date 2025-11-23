import * as THREE from './vendor/three.module.js';
import { XRButton } from './vendor/addons/webxr/XRButton.js';
import { initScene, getScene, getRenderer, getCamera, updateSceneVisuals } from './modules/scene.js';
import { initPlayerController, updatePlayerController } from './modules/PlayerController.js';
import { initUI, updateHud, showHud } from './modules/UIManager.js';
import { initModals, showModal } from './modules/ModalManager.js';
import { vrGameLoop } from './modules/vrGameLoop.js';
import { Telemetry } from './modules/telemetry.js';
import { state, resetGame } from './modules/state.js';
import { applyAllTalentEffects } from './modules/ascension.js';
import { AudioManager } from './modules/audio.js';
import { bossData } from './modules/bosses.js'; // Import bossData here

let renderer;
let lastRenderTime = 0;

function render(timestamp, frame) {
    const delta = lastRenderTime ? (timestamp - lastRenderTime) : 16;
    lastRenderTime = timestamp;
    Telemetry.recordFrame();
    updateSceneVisuals(delta);
    updatePlayerController();

    if (!state.isPaused) {
        vrGameLoop();
    }

    if (state.gameOver && !state.isPaused) {
        showModal('gameOver');
    }

    updateHud();
    renderer.render(getScene(), getCamera());
}

export async function launchVR(initialStage = 1, options = {}) {
    const { startPaused = false, initialModalId = null } = options;
    initScene();
    renderer = getRenderer();
    document.getElementById('vrContainer').appendChild(renderer.domElement);
    renderer.xr.enabled = true;

    await initPlayerController();
    initUI();
    initModals();
    AudioManager.setup(getCamera());
    AudioManager.applySettings(state.settings);

    // Pass bossData to resetGame to prevent the crash
    resetGame(bossData);
    state.currentStage = initialStage;
    state.isPaused = !!startPaused;

    renderer.setAnimationLoop(render);

    if (navigator.xr && navigator.xr.isSessionSupported) {
        try {
            const supported = await navigator.xr.isSessionSupported('immersive-vr');
            if (supported) {
                const button = XRButton.createButton(renderer);
                document.body.appendChild(button);
                renderer.xr.addEventListener('sessionstart', () => {
                    showHud();
                });
            } else {
                showHud();
            }
        } catch (err) {
            console.warn('XR support check failed', err);
            showHud();
        }
    } else {
        showHud();
    }

    // Allow stage selection via keyboard for desktop diagnostics
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            showModal('levelSelect');
        }
    });

    if (initialModalId) {
        showModal(initialModalId);
    }

    // Session end will return control to the page without reloading
}
