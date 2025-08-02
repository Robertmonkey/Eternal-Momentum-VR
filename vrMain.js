import * as THREE from './vendor/three.module.js';
import { XRButton } from './vendor/addons/webxr/XRButton.js';
import { initScene, getScene, getRenderer, getCamera } from './modules/scene.js';
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

function render(timestamp, frame) {
    if (!renderer.xr.isPresenting) return;

    Telemetry.recordFrame();
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

export async function launchVR(initialStage = 1) {
    initScene();
    renderer = getRenderer();
    document.getElementById('vrContainer').appendChild(renderer.domElement);
    renderer.xr.enabled = true;

    await initPlayerController();
    initUI();
    initModals();
    AudioManager.setup(getCamera());
    
    // Pass bossData to resetGame to prevent the crash
    resetGame(bossData);
    state.currentStage = initialStage;
    state.isPaused = false;

    // Create a WebXR button that lets the user choose between VR and AR
    const button = XRButton.createButton(renderer);
    document.body.appendChild(button);

    // Allow stage selection via keyboard for desktop diagnostics
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            showModal('levelSelect');
        }
    });
    
    renderer.xr.addEventListener('sessionstart', () => {
        showHud();
        renderer.setAnimationLoop(render);
    });

    // Session end will return control to the page without reloading
}
